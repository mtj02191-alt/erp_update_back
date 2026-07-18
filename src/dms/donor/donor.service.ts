import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Donor, DonorType } from "./entities/donor.entity";
import { CreateDonorDto } from "./dto/create-donor.dto";
import { UpdateDonorDto } from "./dto/update-donor.dto";
import {
  applyCommonFilters,
  FilterPayload,
} from "../../utils/filters/common-filter.util";
import * as bcrypt from "bcrypt";
import { User, Department } from "src/users/user.entity";
import { UsersService } from "src/users/users.service";
import { City } from "../geographic/cities/entities/city.entity";
import { DashboardAggregateService } from "../../dashboard/dashboard-aggregate.service";
import {
  decryptDonorPassword,
  encryptDonorPassword,
  generateRandomPassword,
} from "src/utils/crypto/donor-password-vault";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  donor_type?: string;
  city?: string;
  country?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  /** Narrow list to website (online) vs non-website (offline) donors */
  source?: "online" | "offline";
}

@Injectable()
export class DonorService {
  constructor(
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    private readonly usersService: UsersService,
    private readonly dashboardAggregateService: DashboardAggregateService,
  ) {}

  /**
   * Resolve a user's geographic assignments (IDs) to a unique list of city name strings.
   * Returns null if the user has no geographic assignments (meaning no geo filter needed).
   */
  async resolveUserGeography(userId: number): Promise<string[] | null> {
    try {
      if (userId === -1) return null;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return null;

      if (user.department !== Department.FUND_RAISING) return null;

      const assignedCountries = user.assigned_countries || [];
      const assignedRegions = user.assigned_regions || [];
      const assignedDistricts = user.assigned_districts || [];
      const assignedTehsils = user.assigned_tehsils || [];
      const assignedCities = user.assigned_cities || [];

      if (
        !assignedCountries.length &&
        !assignedRegions.length &&
        !assignedDistricts.length &&
        !assignedTehsils.length &&
        !assignedCities.length
      ) {
        return null;
      }

      const allCityNames: Set<string> = new Set();

      if (assignedCities.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.name")
          .where("city.id IN (:...ids)", { ids: assignedCities })
          .getMany();
        cities.forEach((c) => allCityNames.add(c.name.toLowerCase().trim()));
      }

      if (assignedTehsils.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.name")
          .where("city.tehsil_id IN (:...ids)", { ids: assignedTehsils })
          .getMany();
        cities.forEach((c) => allCityNames.add(c.name.toLowerCase().trim()));
      }

      if (assignedDistricts.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.name")
          .where("city.district_id IN (:...ids)", { ids: assignedDistricts })
          .getMany();
        cities.forEach((c) => allCityNames.add(c.name.toLowerCase().trim()));
      }

      if (assignedRegions.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.name")
          .where("city.region_id IN (:...ids)", { ids: assignedRegions })
          .getMany();
        cities.forEach((c) => allCityNames.add(c.name.toLowerCase().trim()));
      }

      if (assignedCountries.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.name")
          .where("city.country_id IN (:...ids)", { ids: assignedCountries })
          .getMany();
        cities.forEach((c) => allCityNames.add(c.name.toLowerCase().trim()));
      }

      return allCityNames.size > 0 ? Array.from(allCityNames) : null;
    } catch (error) {
      console.error("Error resolving user geography:", error);
      return null;
    }
  }

  /**
   * Create a new donor (individual or CSR)
   */
  async register(createDonorDto: CreateDonorDto, user: any): Promise<Donor> {
    try {
      // Check if email already exists
      const existingDonor = await this.donorRepository.findOne({
        where: { email: createDonorDto.email },
      });

      if (existingDonor) {
        throw new ConflictException("Email already exists");
      }
      let assigned_to = null;
      let referred_by = null;
      if (createDonorDto?.referrer_user_id) {
        // Check if referrer user exists
        referred_by = await this.userRepository.findOne({
          where: { id: createDonorDto.referrer_user_id },
        });
        if (!referred_by) {
          throw new NotFoundException("Referrer user not found");
        }
      }

      if (createDonorDto?.assigned_to_user_id) {
        // Check if assigned to user exists
        assigned_to = await this.usersService.findOne(
          createDonorDto.assigned_to_user_id,
        );
        if (!assigned_to) {
          throw new NotFoundException("Assigned to user not found");
        }
      }
      // Password handling (Option C):
      // - If password provided: store bcrypt hash + encrypted copy.
      // - If not provided: generate password, store bcrypt hash + encrypted copy (do not return plaintext).
      const plainPassword = createDonorDto.password || generateRandomPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const enc = encryptDonorPassword(plainPassword);

      // Create donor entity
      const donor = this.donorRepository.create({
        ...createDonorDto,
        password: hashedPassword,
        password_enc: enc.payload,
        password_enc_version: enc.version,
        assigned_to,
        referred_by,
        created_by: user,
      });

      // Save and return
      const savedDonor = await this.donorRepository.save(donor);

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      // Remove password from response
      delete savedDonor.password;
      delete (savedDonor as any).password_enc;

      return savedDonor;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException(`Failed to create donor: ${error.message}`);
    }
  }

  /**
   * Find all donors with pagination and filtering
   */
  async findAll(
    options: any,
    assignedCityNames?: string[] | null,
    sourceAccess?: { online: boolean; offline: boolean },
  ) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortField = "created_at",
        sortOrder = "DESC",
        search = "",
        donor_type = "",
        city = "",
        country = "",
        is_active,
        start_date,
        end_date,
        multi_time_donor,
        source,
      } = options;

      const skip = (page - 1) * pageSize;

      // Define searchable fields based on donor type
      const searchFields = [
        "name",
        "first_name",
        "last_name",
        "email",
        "phone",
        "company_name",
        "contact_person",
        "city",
        "country",
      ];

      // Create base query
      const queryBuilder = this.donorRepository.createQueryBuilder("donor");

      // Apply common filters using our utility
      const filters: FilterPayload = {
        search,
        donor_type,
        city,
        country,
        start_date,
        end_date,
        multi_time_donor,
      };

      applyCommonFilters(queryBuilder, filters, searchFields, "donor");

      queryBuilder.andWhere("donor.is_archived = :is_archived", {
        is_archived: false,
      });

      // Apply is_active filter
      if (is_active !== undefined) {
        queryBuilder.andWhere("donor.is_active = :is_active", { is_active });
      }

      // Apply online/offline source filter based on user permissions
      if (sourceAccess) {
        if (!sourceAccess.online && sourceAccess.offline) {
          // User can only see offline donors (source != 'website')
          queryBuilder.andWhere("COALESCE(donor.source, '') != 'website'");
        } else if (sourceAccess.online && !sourceAccess.offline) {
          // User can only see online donors (source = 'website')
          queryBuilder.andWhere("donor.source = 'website'");
        }
        // If both true, no source filter needed
      }

      // Optional list filter: narrow by online (website) vs offline (non-website) donors
      if (source === "online") {
        queryBuilder.andWhere("donor.source = :websiteSource", {
          websiteSource: "website",
        });
      } else if (source === "offline") {
        queryBuilder.andWhere("COALESCE(donor.source, '') != :websiteSource", {
          websiteSource: "website",
        });
      }

      // Geographic filter — restrict donors to user's assigned city names
      if (assignedCityNames && assignedCityNames.length > 0) {
        queryBuilder.andWhere(
          "LOWER(TRIM(donor.city)) IN (:...assignedCityNames)",
          { assignedCityNames },
        );
      }

      // Apply sorting
      const validSortFields = [
        "name",
        "company_name",
        "email",
        "city",
        "country",
        "donor_type",
        "created_at",
        "total_donated",
        "donation_count",
        "last_donation_date",
      ];
      const sortFieldName = validSortFields.includes(sortField)
        ? sortField
        : "created_at";
      queryBuilder.orderBy(`donor.${sortFieldName}`, sortOrder);

      // Apply pagination only if pageSize > 0
      if (pageSize > 0) {
        queryBuilder.skip(skip).take(pageSize);
      }

      // Execute query
      const [data, total] = await queryBuilder.getManyAndCount();

      // Remove passwords from response
      data.forEach((donor) => delete donor.password);

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
          hasNext: pageSize > 0 ? page < Math.ceil(total / pageSize) : false,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new NotFoundException(
        `Failed to retrieve donors: ${error.message}`,
      );
    }
  }

  /**
   * Find one donor by ID
   */
  /**
   * Find donor by email AND phone (for auto-registration check)
   */
  async findByEmailAndPhone(
    email: string,
    phone: string,
  ): Promise<Donor | null> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { email, phone, is_archived: false },
      });

      return donor || null;
    } catch (error) {
      console.error("Error finding donor by email and phone:", error);
      return null;
    }
  }

  /**
   * Find donor by email OR phone (or both).
   * - If only phone: find by phone.
   * - If only email: find by email.
   * - If both: find first donor where email or phone matches.
   */
  async findByEmailOrPhone(
    email?: string,
    phone?: string,
  ): Promise<Donor | null> {
    try {
      const hasEmail = email != null && String(email).trim() !== "";
      const hasPhone = phone != null && String(phone).trim() !== "";

      if (!hasEmail && !hasPhone) {
        return null;
      }

      if (hasEmail && !hasPhone) {
        const donor = await this.donorRepository.findOne({
          where: { email: email!.trim(), is_archived: false },
        });
        if (donor) delete donor.password;
        return donor ?? null;
      }

      if (hasPhone && !hasEmail) {
        const donor = await this.donorRepository.findOne({
          where: { phone: phone!.trim(), is_archived: false },
        });
        if (donor) delete donor.password;
        return donor ?? null;
      }

      // Both provided: first donor where email OR phone matches
      const donor = await this.donorRepository
        .createQueryBuilder("donor")
        .where("donor.is_archived = :is_archived", { is_archived: false })
        .andWhere("(donor.email = :email OR donor.phone = :phone)", {
          email: email!.trim(),
          phone: phone!.trim(),
        })
        .getOne();

      if (donor) delete donor.password;
      return donor ?? null;
    } catch (error) {
      console.error("Error finding donor by email or phone:", error);
      return null;
    }
  }

  /**
   * Auto-register donor from donation data (without password)
   */
  async autoRegisterFromDonation(donationData: {
    donor_name?: string;
    donor_email?: string;
    donor_phone?: string;
    city?: string;
    country?: string;
    address?: string;
    notification_subscription?: boolean;
  }): Promise<Donor | null> {
    try {
      const {
        donor_name,
        donor_email,
        donor_phone,
        city,
        country,
        address,
        notification_subscription,
      } = donationData;

      // Validate required fields
      if (!donor_email || !donor_phone) {
        console.warn("Cannot auto-register donor: missing email or phone");
        return null;
      }

      // Create donor entity WITHOUT password
      // Password will be set when they explicitly register/login (donor portal flow).
      const donor = this.donorRepository.create({
        donor_type: DonorType.INDIVIDUAL,
        email: donor_email,
        password: null, // No password for auto-registered donors
        password_enc: null,
        password_enc_version: 0,
        phone: donor_phone,
        name: donor_name || "Anonymous Donor",
        city: city || null,
        country: country || null,
        address: address || null,
        is_active: true,
        notes: "Auto-registered from donation - Password not set",
        notification_subscription: notification_subscription !== false,
      });

      // Save and return
      const savedDonor = await this.donorRepository.save(donor);

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      console.log(
        `✅ Auto-registered donor WITHOUT password: ${donor_email} (ID: ${savedDonor.id})`,
      );

      return savedDonor;
    } catch (error) {
      console.error("Error auto-registering donor:", error.message);
      return null;
    }
  }

  async findOne(id: number): Promise<Donor> {
    try {
      // i want donations also here
      const donor = await this.donorRepository.findOne({
        where: { id, is_archived: false },
        relations: ["donations"],
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      // Remove password from response
      delete donor.password;

      return donor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to retrieve donor: ${error.message}`);
    }
  }

  /**
   * Find donor by email (for authentication)
   */
  async findByEmail(email: string): Promise<Donor | null> {
    return await this.donorRepository.findOne({
      where: { email, is_archived: false },
    });
  }

  /**
   * Validate donor credentials (for login)
   */
  async validateDonor(email: string, password: string): Promise<Donor> {
    const donor = await this.findByEmail(email);

    if (!donor) {
      throw new NotFoundException("Donor not found");
    }

    const isPasswordValid = await bcrypt.compare(password, donor.password);

    if (!isPasswordValid) {
      throw new NotFoundException("Invalid credentials");
    }

    // Remove password from response
    delete donor.password;

    return donor;
  }

  async revealDonorPassword(donorId: number): Promise<{ password: string }> {
    const donor = await this.donorRepository.findOne({
      where: { id: donorId, is_archived: false },
    });
    if (!donor) throw new NotFoundException("Donor not found");
    if (!donor.password_enc || !donor.password_enc_version) {
      throw new NotFoundException(
        "No stored password available for this donor",
      );
    }

    const password = decryptDonorPassword(
      donor.password_enc,
      donor.password_enc_version,
    );

    await this.donorRepository.update(donorId, {
      password_last_revealed_at: new Date(),
      password_reveal_count: (donor.password_reveal_count || 0) + 1,
    } as any);

    return { password };
  }

  /**
   * Update donor information
   */
  async update(id: number, updateDonorDto: UpdateDonorDto): Promise<Donor> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      // // If password is being updated, hash it
      // if (updateDonorDto.password) {
      //   updateDonorDto.password = await bcrypt.hash(updateDonorDto.password, 10);
      // }

      // Update donor
      Object.assign(donor, updateDonorDto);
      const updatedDonor = await this.donorRepository.save(donor);

      // Remove password from response
      delete updatedDonor.password;

      return updatedDonor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ConflictException(`Failed to update donor: ${error.message}`);
    }
  }

  /**
   * Change donor password
   */
  async changePassword(
    donorId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id: donorId, is_archived: false },
      });

      if (!donor) {
        throw new NotFoundException("Donor not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        donor.password,
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

      // Hash and save new password
      donor.password = await bcrypt.hash(newPassword, 10);
      const enc = encryptDonorPassword(newPassword);
      donor.password_enc = enc.payload as any;
      donor.password_enc_version = enc.version as any;
      await this.donorRepository.save(donor);

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

  async resetPasswordAdmin(donorId: number): Promise<{ password: string }> {
    const donor = await this.donorRepository.findOne({
      where: { id: donorId, is_archived: false },
    });
    if (!donor) throw new NotFoundException("Donor not found");

    const plainPassword = generateRandomPassword();
    donor.password = await bcrypt.hash(plainPassword, 10);
    const enc = encryptDonorPassword(plainPassword);
    donor.password_enc = enc.payload as any;
    donor.password_enc_version = enc.version as any;
    donor.password_last_revealed_at = new Date();
    donor.password_reveal_count = (donor.password_reveal_count || 0) + 1;

    await this.donorRepository.save(donor);
    return { password: plainPassword };
  }

  /**
   * Soft delete (deactivate) donor
   */
  async remove(id: number, user: any): Promise<{ message: string }> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      // Soft delete - set is_active to false
      donor.is_active = false;
      donor.is_archived = true;
      donor.updated_by = user;
      await this.donorRepository.save(donor);

      return { message: "Donor deactivated successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ConflictException(`Failed to remove donor: ${error.message}`);
    }
  }

  /**
   * Update donation statistics
   */
  async updateDonationStats(donorId: number, amount: number): Promise<void> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id: donorId, is_archived: false },
      });

      if (donor) {
        donor.total_donated = Number(donor.total_donated) + amount;
        donor.donation_count += 1;
        donor.last_donation_date = new Date();
        await this.donorRepository.save(donor);
      }
    } catch (error) {
      console.error("Failed to update donation stats:", error);
    }
  }

  /**
   * Validate password strength
   */
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
}
