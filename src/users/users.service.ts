import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User, UserRole, Department } from "./user.entity";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import {
  applyCommonFilters,
  FilterPayload,
} from "../utils/filters/common-filter.util";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserWithPermissionsDto } from "./dto/update-user-with-permissions.dto";
import {
  UserGeographicContext,
  USER_GEOGRAPHIC_SELECT,
} from "./user-geographic.types";
import { GeographicAssignmentService } from "../dms/geographic/geographic-assignment/geographic-assignment.service";
import {
  decryptDonorPassword,
  encryptDonorPassword,
} from "../utils/crypto/donor-password-vault";
import { EmailService } from "../email/email.service";
import { DataScopeService } from "../permissions/data-scope/data-scope.service";

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
  private readonly logger = new Logger(UsersService.name);
  // Define searchable columns for user search
  private readonly searchableColumns = ["first_name", "last_name", "email"];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PermissionsEntity)
    private readonly permissionsRepository: Repository<PermissionsEntity>,
    private readonly geographicAssignmentService: GeographicAssignmentService,
    private readonly emailService: EmailService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  pickGeographicContext(
    user: Pick<
      User,
      | "assigned_countries"
      | "assigned_regions"
      | "assigned_districts"
      | "assigned_tehsils"
      | "assigned_cities"
      | "assigned_routes"
      | "geographic_off"
      | "manager_id"
    > | null | undefined,
  ): UserGeographicContext {
    return {
      assigned_countries: user?.assigned_countries ?? null,
      assigned_regions: user?.assigned_regions ?? null,
      assigned_districts: user?.assigned_districts ?? null,
      assigned_tehsils: user?.assigned_tehsils ?? null,
      assigned_cities: user?.assigned_cities ?? null,
      assigned_routes: user?.assigned_routes ?? null,
      geographic_off: user?.geographic_off === true,
      manager_id: user?.manager_id ?? null,
    };
  }

  async getGeographicContextByUserId(
    userId: number,
  ): Promise<UserGeographicContext | null> {
    if (!userId || userId === -1) return null;
    const user = await this.userRepository
      .createQueryBuilder("user")
      .select([...USER_GEOGRAPHIC_SELECT])
      .where("user.id = :id", { id: userId })
      .getOne();
    if (!user) return null;
    return this.pickGeographicContext(user);
  }

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
    const enc = encryptDonorPassword(password);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      password_enc: enc.payload,
      password_enc_version: enc.version,
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

  private getLocalDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private generateTemporaryPassword(): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%&*";
    const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];
    const base = [
      pick(upper),
      pick(lower),
      pick(digits),
      pick(special),
      ...Array.from({ length: 8 }, () =>
        pick(upper + lower + digits + special),
      ),
    ];
    for (let i = base.length - 1; i > 0; i -= 1) {
      const j = crypto.randomInt(0, i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base.join("");
  }

  /**
   * Forgot password: if email exists, generate a temporary password,
   * save it, and email it. Always returns a generic message (no email enumeration).
   * Max 5 requests per calendar day per account.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage =
      "If an account exists for this email, a new password has been sent.";
    const maxPerDay = 5;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!normalizedEmail) {
      return { message: genericMessage };
    }

    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail, is_archived: false },
    });

    if (!user || user.isActive === false) {
      return { message: genericMessage };
    }

    const today = this.getLocalDateKey();
    const resetDay =
      user.password_reset_day != null
        ? String(user.password_reset_day).slice(0, 10)
        : null;
    const count =
      resetDay === today ? Number(user.password_reset_count || 0) : 0;

    if (count >= maxPerDay) {
      throw new HttpException(
        "You have reached the maximum of 5 password reset requests for today. Please try again tomorrow.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const plainPassword = this.generateTemporaryPassword();
    const passwordFields = await this.buildPasswordFields(plainPassword);
    Object.assign(user, passwordFields, {
      password_reset_day: today,
      password_reset_count: count + 1,
    });
    await this.userRepository.save(user);

    const sent = await this.emailService.sendTemporaryPasswordEmail({
      to: user.email,
      userName:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.email,
      temporaryPassword: plainPassword,
    });

    if (!sent) {
      this.logger.error(
        `Password was reset for ${user.email} but email failed to send`,
      );
      throw new ConflictException(
        "Could not send email. Please try again later or contact support.",
      );
    }

    this.logger.log(
      `Temporary password emailed to ${user.email} (reset ${count + 1}/${maxPerDay} today)`,
    );
    return { message: genericMessage };
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

    const email =
      createUserDto.email?.trim()?.toLowerCase() ||
      `user-${Date.now()}-${Math.floor(Math.random() * 10000)}@placeholder.local`;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }
    const plainPassword = createUserDto.password || "defaultPassword123";
    const passwordFields = await this.buildPasswordFields(plainPassword);

    const { manager_ids, manager_id, ...rest } = createUserDto;
    const managerIdList = this.normalizeManagerIds(manager_ids, manager_id);
    const managers = await this.loadManagersByIds(managerIdList);

    const user = this.userRepository.create({
      ...rest,
      email,
      role: createUserDto.role || UserRole.USER,
      ...passwordFields,
      manager_id: managerIdList[0] ?? null,
      managers,
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

  private hasGeographicAssignments(user: User): boolean {
    return (
      (user.assigned_countries?.length ?? 0) > 0 ||
      (user.assigned_regions?.length ?? 0) > 0 ||
      (user.assigned_districts?.length ?? 0) > 0 ||
      (user.assigned_tehsils?.length ?? 0) > 0 ||
      (user.assigned_cities?.length ?? 0) > 0 ||
      (user.assigned_routes?.length ?? 0) > 0
    );
  }

  /** Merge manager_ids + legacy manager_id; drop invalid / self. */
  private normalizeManagerIds(
    managerIds?: number[] | null,
    managerId?: number | null,
    excludeUserId?: number | null,
  ): number[] {
    const fromArray = Array.isArray(managerIds)
      ? managerIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    const single =
      managerId != null && Number(managerId) > 0 ? [Number(managerId)] : [];
    const exclude = excludeUserId != null ? Number(excludeUserId) : null;
    return Array.from(new Set([...fromArray, ...single])).filter(
      (id) => id !== exclude,
    );
  }

  private async loadManagersByIds(ids: number[]): Promise<User[]> {
    if (!ids.length) return [];
    return this.userRepository.find({
      where: { id: In(ids), is_archived: false },
      select: ["id", "first_name", "last_name", "email", "department", "role"],
    });
  }

  private summarizeManagers(managers: User[] | undefined | null) {
    return (managers || []).map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
    }));
  }

  async findOneForView(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["permissions", "manager", "managers"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const {
      password: _password,
      password_enc: _passwordEnc,
      password_enc_version: _passwordEncVersion,
      password_last_revealed_at: _passwordLastRevealedAt,
      password_reveal_count: _passwordRevealCount,
      resetToken: _resetToken,
      resetTokenExpiry: _resetTokenExpiry,
      manager,
      managers,
      ...safeUser
    } = user;

    const managersSummary = this.summarizeManagers(managers);
    const managerSummary =
      managersSummary[0] ||
      (manager
        ? {
            id: manager.id,
            first_name: manager.first_name,
            last_name: manager.last_name,
            email: manager.email,
          }
        : null);

    let geographic_assignments: Awaited<
      ReturnType<GeographicAssignmentService["resolve"]>
    > = [];

    if (this.hasGeographicAssignments(user)) {
      geographic_assignments = await this.geographicAssignmentService.resolve({
        countries: user.assigned_countries ?? [],
        regions: user.assigned_regions ?? [],
        districts: user.assigned_districts ?? [],
        tehsils: user.assigned_tehsils ?? [],
        cities: user.assigned_cities ?? [],
        routes: user.assigned_routes ?? [],
      });
    }

    return {
      ...safeUser,
      manager_id: managersSummary[0]?.id ?? user.manager_id ?? null,
      manager_ids: managersSummary.map((m) => m.id),
      manager: managerSummary,
      managers: managersSummary,
      geographic_assignments,
    };
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
      const { permissions, manager_ids, manager_id, ...userData } = updateDto;

      // Update user data
      const user = await this.findOne(id);
      Object.assign(user, userData);

      const managersTouched =
        manager_ids !== undefined || manager_id !== undefined;
      if (managersTouched) {
        const managerIdList = this.normalizeManagerIds(
          manager_ids,
          manager_id,
          id,
        );
        user.managers = await this.loadManagersByIds(managerIdList);
        user.manager_id = managerIdList[0] ?? null;
      }

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
        relations: ["permissions", "managers", "manager"],
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

      const passwordFields = await this.buildPasswordFields(newPassword);
      Object.assign(user, passwordFields);
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

      const passwordFields = await this.buildPasswordFields(newPassword);
      Object.assign(targetUser, passwordFields);
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

  async revealUserPassword(userId: number): Promise<{ password: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_archived: false },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (!user.password_enc || !user.password_enc_version) {
      throw new NotFoundException(
        "No stored password available for this user. Change the password once to enable reveal.",
      );
    }

    const password = decryptDonorPassword(
      user.password_enc,
      user.password_enc_version,
    );

    await this.userRepository.update(userId, {
      password_last_revealed_at: new Date(),
      password_reveal_count: (user.password_reveal_count || 0) + 1,
    });

    return { password };
  }

  private async buildPasswordFields(plainPassword: string): Promise<{
    password: string;
    password_enc: string;
    password_enc_version: number;
  }> {
    const password = await bcrypt.hash(plainPassword, 10);
    const enc = encryptDonorPassword(plainPassword);
    return {
      password,
      password_enc: enc.payload,
      password_enc_version: enc.version,
    };
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

  private toTeamFilterUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      department: user.department,
      role: user.role,
      manager_id: user.manager_id,
    };
  }

  /**
   * Hierarchy options for list Team filters (Me / Direct / Entire / pick person).
   */
  async getTeamFilterOptions(currentUserId: number, search?: string) {
    const selfId = Number(currentUserId);
    if (!selfId) {
      return {
        me: null,
        direct_reports: [],
        entire_team: [],
        has_direct_reports: false,
        has_team: false,
      };
    }

    const me = await this.userRepository.findOne({
      where: { id: selfId, is_archived: false },
    });

    const directIds = await this.dataScopeService.getDirectReportIds(selfId);
    const entireIds = await this.dataScopeService.getAllReportIds(selfId);

    const loadByIds = async (ids: number[]) => {
      if (!ids.length) return [];
      const users = await this.userRepository
        .createQueryBuilder("user")
        .where("user.id IN (:...ids)", { ids })
        .andWhere("user.is_archived = :archived", { archived: false })
        .orderBy("user.first_name", "ASC")
        .addOrderBy("user.last_name", "ASC")
        .getMany();
      return users.map((u) => this.toTeamFilterUser(u));
    };

    let direct_reports = await loadByIds(directIds);
    let entire_team = await loadByIds(entireIds);

    const q = (search || "").trim().toLowerCase();
    if (q) {
      const match = (u: {
        full_name: string;
        email: string;
      }) => `${u.full_name} ${u.email}`.toLowerCase().includes(q);
      direct_reports = direct_reports.filter(match);
      entire_team = entire_team.filter(match);
    }

    return {
      me: me ? this.toTeamFilterUser(me) : null,
      direct_reports,
      entire_team,
      has_direct_reports: directIds.length > 0,
      has_team: entireIds.length > 0,
    };
  }
}
