import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole, Department } from "./user.entity";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import {
  applyCommonFilters,
  FilterPayload,
} from "../utils/filters/common-filter.util";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserWithPermissionsDto } from "./dto/update-user-with-permissions.dto";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  department?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  // Define searchable columns for user search
  private readonly searchableColumns = ["first_name", "last_name", "email"];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PermissionsEntity)
    private readonly permissionsRepository: Repository<PermissionsEntity>,
  ) {}

  async create(
    email: string,
    password: string,
    department: Department,
    role: UserRole,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      department,
      role,
    });

    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ["permissions"],
    });
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new NotFoundException("Invalid credentials");
    }

    return user;
  }

  async seedUsers(): Promise<void> {
    const users = [
      {
        username: "store_user",
        password: "store123",
        department: "store",
        role: "user",
      },
      {
        username: "procurements_user",
        password: "procurements123",
        department: "procurements",
        role: "user",
      },
      {
        username: "program_user",
        password: "program123",
        department: "program",
        role: "user",
      },
      {
        username: "finance_user",
        password: "finance123",
        department: "accounts_and_finance",
        role: "user",
      },
      {
        username: "admin",
        password: "admin123",
        department: "store", // Admin can access all departments
        role: "admin",
      },
    ];

    for (const user of users) {
      try {
        await this.create(
          user.username,
          user.password,
          Department[user.department.toUpperCase()],
          UserRole[user.role.toUpperCase()],
        );
      } catch (error) {
        if (error instanceof ConflictException) {
          console.log(`User ${user.username} already exists`);
        } else {
          throw error;
        }
      }
    }
  }

  async createFromDto(
    createUserDto: CreateUserDto,
    currentUser: User,
  ): Promise<User> {
    // Only admin can create users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ConflictException("Only admin can create users");
    }
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }
    const hashedPassword = await bcrypt.hash(
      createUserDto.password || "defaultPassword123",
      10,
    );
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
  }

  async findAll(options: PaginationOptions) {
    const {
      page = 1,
      pageSize = 10,
      sortField = "created_at",
      sortOrder = "DESC",
      search = "",
      department = "",
      role = "",
      isActive,
    } = options;

    const skip = (page - 1) * pageSize;

    // Build query builder for filtering and sorting
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.permissions", "permissions");

    // Build filters object for common filter utility
    const filters: FilterPayload = {
      search,
      department,
      role,
    };

    // Apply common filters using utility
    applyCommonFilters(queryBuilder, filters, this.searchableColumns, "user");

    // Apply active status filter separately (boolean handling)
    if (isActive !== undefined) {
      queryBuilder.andWhere("user.isActive = :isActive", { isActive });
    }

    // Apply sorting
    const validSortFields = [
      "first_name",
      "last_name",
      "email",
      "department",
      "role",
      "created_at",
      "joining_date",
    ];
    const sortFieldName = validSortFields.includes(sortField)
      ? sortField
      : "created_at";
    queryBuilder.orderBy(`user.${sortFieldName}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async update(
    id: number,
    updateDto: UpdateUserWithPermissionsDto,
    currentUser: User,
  ): Promise<User> {
    try {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ConflictException("Only admin can update users");
      }

      // Extract user data and permissions
      const { permissions, ...userData } = updateDto;

      // Update user data
      const user = await this.findOne(id);
      Object.assign(user, userData);
      await this.userRepository.save(user);

      // Update permissions if provided
      if (permissions) {
        // Find existing permissions or create new ones
        let userPermissions = await this.permissionsRepository.findOne({
          where: { user_id: id },
        });

        if (userPermissions) {
          // Check if permissions have actually changed
          const currentPermissions = userPermissions.permissions;
          const permissionsChanged =
            JSON.stringify(currentPermissions) !== JSON.stringify(permissions);

          if (permissionsChanged) {
            // Update existing permissions
            userPermissions.permissions = permissions;
            await this.permissionsRepository.save(userPermissions);
          } else {
            console.log("Permissions unchanged, skipping update");
          }
        } else {
          // Create new permissions
          userPermissions = this.permissionsRepository.create({
            user_id: id,
            permissions: permissions,
          });
          await this.permissionsRepository.save(userPermissions);
        }
      }

      // Return updated user with permissions
      return await this.userRepository.findOne({
        where: { id },
        relations: ["permissions"],
      });
    } catch (error) {
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<{ message: string }> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ConflictException("Only admin can delete users");
    }
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    return { message: "User deleted successfully" };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Find the user
      const user = await this.findOne(userId);
      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new ConflictException("Current password is incorrect");
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new ConflictException(
          `Password requirements not met: ${passwordValidation.errors.join(", ")}`,
        );
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      user.password = hashedNewPassword;
      await this.userRepository.save(user);

      return { message: "Password changed successfully" };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new ConflictException("Failed to change password");
    }
  }

  async changePasswordByAdmin(
    adminUser: User,
    targetUserId: number,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Only admin can change other users' passwords
      if (adminUser.role !== UserRole.ADMIN) {
        throw new ConflictException(
          "Only admin can change other users' passwords",
        );
      }

      // Find the target user
      const targetUser = await this.findOne(targetUserId);
      if (!targetUser) {
        throw new NotFoundException("User not found");
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new ConflictException(
          `Password requirements not met: ${passwordValidation.errors.join(", ")}`,
        );
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      targetUser.password = hashedNewPassword;
      await this.userRepository.save(targetUser);

      return { message: "Password changed successfully" };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new ConflictException("Failed to change password");
    }
  }

  private validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Minimum 8 characters");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("At least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("At least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("At least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getUsersByDepartment(
    department: Department,
    page = 1,
    pageSize = 10,
  ): Promise<{ data: User[]; pagination: any }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .where("user.department = :department", { department })
      .andWhere("user.isActive = :isActive", { isActive: true });

    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    queryBuilder.orderBy("user.first_name", "ASC");

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getUserListForDropdown(options?: {
    activeOnly?: boolean;
    department?: string;
    search?: string;
  }): Promise<any> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .select([
        "user.id",
        "user.email",
        "user.first_name",
        "user.last_name",
        "user.department",
        "user.role",
        "user.isActive",
      ]);

    // // Filter by active status if specified
    // if (options?.activeOnly !== undefined) {
    //   queryBuilder.andWhere('user.isActive = :isActive', { isActive: options.activeOnly });
    // }

    // Filter by department if specified
    if (options?.department) {
      queryBuilder.andWhere("user.department = :department", {
        department: options.department,
      });
    }

    // Search functionality - search across name and email fields
    if (options?.search && options.search.trim() !== "") {
      const searchTerm = `%${options.search.trim()}%`;
      queryBuilder.andWhere(
        "(COALESCE(user.first_name, '') ILIKE :searchTerm OR COALESCE(user.last_name, '') ILIKE :searchTerm OR user.email ILIKE :searchTerm)",
        { searchTerm },
      );
    }

    // Exclude archived users
    queryBuilder.andWhere("user.is_archived = :archived", { archived: false });

    // Order by name
    queryBuilder
      .orderBy("user.first_name", "ASC")
      .addOrderBy("user.last_name", "ASC");
    const users = await queryBuilder.getMany();

    console.log("querybuilder results", queryBuilder.getQueryAndParameters());
    // Transform to include full_name
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      department: user.department,
      role: user.role,
      isActive: user.isActive,
    }));
  }

  async findByIds(ids: number[]): Promise<User[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    const uniqueValidIds = Array.from(
      new Set(
        ids
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (uniqueValidIds.length === 0) {
      return [];
    }

    return this.userRepository
      .createQueryBuilder("user")
      .where("user.id IN (:...ids)", { ids: uniqueValidIds })
      .andWhere("user.is_archived = :archived", { archived: false })
      .getMany();
  }
}
