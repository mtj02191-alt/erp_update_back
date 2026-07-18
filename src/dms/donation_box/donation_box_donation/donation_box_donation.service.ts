import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonationBoxDonation } from "./entities/donation_box_donation.entity";
import { CreateDonationBoxDonationDto } from "./dto/create-donation_box_donation.dto";
import { UpdateDonationBoxDonationDto } from "./dto/update-donation_box_donation.dto";
import { DonationBox } from "../entities/donation-box.entity";
import { City } from "../../geographic/cities/entities/city.entity";
import {
  applyCommonFilters,
  FilterPayload,
  applyHybridFilters,
  HybridFilter,
} from "../../../utils/filters/common-filter.util";
import { User, Department } from "../../../users/user.entity";
import { DashboardAggregateService } from "../../../dashboard/dashboard-aggregate.service";
import { CollectionStatus } from "./entities/donation_box_donation.entity";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  donation_box_id?: number;
  status?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
}

@Injectable()
export class DonationBoxDonationService {
  constructor(
    @InjectRepository(DonationBoxDonation)
    private readonly donationBoxDonationRepository: Repository<DonationBoxDonation>,
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dashboardAggregateService: DashboardAggregateService,
  ) {}

  /**
   * Resolve a user's geographic assignments (IDs) to a unique list of city IDs.
   * Returns null if the user has no geographic assignments (meaning no geo filter needed).
   */
  async resolveUserGeographyCityIds(userId: number): Promise<number[] | null> {
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

      const allCityIds: Set<number> = new Set();

      assignedCities.forEach((id) => allCityIds.add(id));

      if (assignedTehsils.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.id")
          .where("city.tehsil_id IN (:...ids)", { ids: assignedTehsils })
          .getMany();
        cities.forEach((c) => allCityIds.add(c.id));
      }

      if (assignedDistricts.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.id")
          .where("city.district_id IN (:...ids)", { ids: assignedDistricts })
          .getMany();
        cities.forEach((c) => allCityIds.add(c.id));
      }

      if (assignedRegions.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.id")
          .where("city.region_id IN (:...ids)", { ids: assignedRegions })
          .getMany();
        cities.forEach((c) => allCityIds.add(c.id));
      }

      if (assignedCountries.length) {
        const cities = await this.cityRepository
          .createQueryBuilder("city")
          .select("city.id")
          .where("city.country_id IN (:...ids)", { ids: assignedCountries })
          .getMany();
        cities.forEach((c) => allCityIds.add(c.id));
      }

      return allCityIds.size > 0 ? Array.from(allCityIds) : null;
    } catch (error) {
      console.error("Error resolving user geography city IDs:", error);
      return null;
    }
  }

  /**
   * Get current user from request context
   * This should be implemented based on your authentication system
   */
  private getCurrentUserId(): number | null {
    // TODO: Implement based on your authentication system
    // This could be from JWT token, session, or request context
    // For now, returning null - you'll need to implement this
    return null;
  }

  /**
   * Create a new donation box collection record
   */
  async create(
    createDonationBoxDonationDto: CreateDonationBoxDonationDto,
    currentUserId?: number,
  ): Promise<DonationBoxDonation> {
    try {
      // Validate that donation box exists
      const donationBox = await this.donationBoxRepository.findOne({
        where: { id: createDonationBoxDonationDto.donation_box_id },
      });

      if (!donationBox) {
        throw new NotFoundException(
          `Donation box with ID ${createDonationBoxDonationDto.donation_box_id} not found`,
        );
      }

      // Validate collection amount
      if (createDonationBoxDonationDto.collection_amount < 0) {
        throw new BadRequestException("Collection amount cannot be negative");
      }

      // Auto-populate collected_by_id if not provided
      const userId = currentUserId || this.getCurrentUserId();
      if (!createDonationBoxDonationDto.collected_by_id && userId) {
        createDonationBoxDonationDto.collected_by_id = userId;
      }

      // Create the collection record
      const collection = this.donationBoxDonationRepository.create(
        createDonationBoxDonationDto,
      );

      const savedCollection =
        await this.donationBoxDonationRepository.save(collection);

      // Update donation box statistics
      await this.updateDonationBoxStats(
        createDonationBoxDonationDto.donation_box_id,
        createDonationBoxDonationDto.collection_amount,
        new Date(createDonationBoxDonationDto.collection_date),
      );

      console.log(
        `✅ Collection recorded for donation box ID: ${createDonationBoxDonationDto.donation_box_id}, Amount: ${createDonationBoxDonationDto.collection_amount}`,
      );

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      // Return with relations
      return await this.donationBoxDonationRepository.findOne({
        where: { id: savedCollection.id },
        relations: ["donation_box", "collected_by", "verified_by"],
      });
    } catch (error) {
      console.log("error", error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to create collection record: ${error.message}`);
    }
  }

  /**
   * Find all collections with pagination and filtering
   */
  async findAll(options: PaginationOptions, assignedCityIds?: number[] | null) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortField = "collection_date",
        sortOrder = "DESC",
        search = "",
        donation_box_id,
        status = "",
        payment_method = "",
        start_date,
        end_date,
      } = options;

      const skip = (page - 1) * pageSize;

      // Define searchable fields
      const searchFields = [
        "collector_name",
        "notes",
        "bank_deposit_slip_no",
        "receipt_number",
        "cheque_number",
        "bank_name",
      ];

      // Build query with relations
      const query = this.donationBoxDonationRepository
        .createQueryBuilder("donation_box_donation")
        .leftJoinAndSelect("donation_box_donation.donation_box", "donation_box")
        .leftJoinAndSelect("donation_box_donation.collected_by", "collected_by")
        .leftJoinAndSelect("donation_box_donation.verified_by", "verified_by")
        .leftJoinAndSelect("donation_box.route", "route");

      // Apply common filters
      const filters: FilterPayload = {
        search,
        status,
        payment_method,
        start_date,
        end_date,
      };

      if (donation_box_id) {
        filters.donation_box_id = donation_box_id;
      }

      applyCommonFilters(query, filters, searchFields, "donation_box_donation");

      // Apply geographic restriction through parent donation box's city_id
      if (assignedCityIds && assignedCityIds.length > 0) {
        query.andWhere("donation_box.city_id IN (:...assignedCityIds)", {
          assignedCityIds,
        });
      }

      // Apply sorting (whitelist to prevent SQL injection)
      const allowedSortFields = [
        "collection_date",
        "collection_amount",
        "created_at",
        "status",
        "deposit_date",
      ];
      const safeSortField = allowedSortFields.includes(sortField)
        ? sortField
        : "collection_date";
      query.orderBy(`donation_box_donation.${safeSortField}`, sortOrder);

      // Apply pagination
      query.skip(skip).take(pageSize);

      // Execute query
      const [data, total] = await query.getManyAndCount();
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
    } catch (error) {
      console.log("error", error);
      throw new Error(
        `Failed to retrieve collection records: ${error.message}`,
      );
    }
  }

  /**
   * Find one collection by ID
   */
  async findOne(id: number): Promise<DonationBoxDonation> {
    try {
      const collection = await this.donationBoxDonationRepository.findOne({
        where: { id },
        relations: ["donation_box", "collected_by", "verified_by"],
      });

      if (!collection) {
        throw new NotFoundException(
          `Collection record with ID ${id} not found`,
        );
      }

      return collection;
    } catch (error) {
      console.log("error", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve collection record: ${error.message}`);
    }
  }

  /**
   * Get collections by donation box ID
   */
  async findByDonationBox(
    donationBoxId: number,
  ): Promise<DonationBoxDonation[]> {
    try {
      return await this.donationBoxDonationRepository.find({
        where: { donation_box_id: donationBoxId },
        relations: ["donation_box", "collected_by", "verified_by"],
        order: { collection_date: "DESC" },
      });
    } catch (error) {
      console.log("error", error);
      throw new Error(
        `Failed to retrieve collections for box: ${error.message}`,
      );
    }
  }

  /**
   * Update a collection record
   */
  async update(
    id: number,
    updateDonationBoxDonationDto: UpdateDonationBoxDonationDto,
    currentUserId?: number,
  ): Promise<DonationBoxDonation> {
    try {
      const collection = await this.donationBoxDonationRepository.findOne({
        where: { id },
      });

      if (!collection) {
        throw new NotFoundException(
          `Collection record with ID ${id} not found`,
        );
      }

      // Auto-populate collected_by_id if not provided and current user is available
      const userId = currentUserId || this.getCurrentUserId();
      if (!updateDonationBoxDonationDto.collected_by_id && userId) {
        updateDonationBoxDonationDto.collected_by_id = userId;
      }

      // If donation_box_id is being changed, validate the new box exists
      if (
        updateDonationBoxDonationDto.donation_box_id &&
        updateDonationBoxDonationDto.donation_box_id !==
          collection.donation_box_id
      ) {
        const newBox = await this.donationBoxRepository.findOne({
          where: { id: updateDonationBoxDonationDto.donation_box_id },
        });

        if (!newBox) {
          throw new NotFoundException(
            `Donation box with ID ${updateDonationBoxDonationDto.donation_box_id} not found`,
          );
        }
      }

      // Update the entity
      await this.donationBoxDonationRepository.update(
        id,
        updateDonationBoxDonationDto,
      );

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      // Return updated entity with relations
      return await this.donationBoxDonationRepository.findOne({
        where: { id },
        relations: ["donation_box", "collected_by", "verified_by"],
      });
    } catch (error) {
      console.log("error", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update collection record: ${error.message}`);
    }
  }

  /**
   * Soft delete a collection record (archive)
   */
  async remove(id: number) {
    try {
      const collection = await this.donationBoxDonationRepository.findOne({
        where: { id },
      });

      if (!collection) {
        throw new NotFoundException(
          `Collection record with ID ${id} not found`,
        );
      }

      // Soft delete by setting is_archived to true
      await this.donationBoxDonationRepository.update(id, {
        is_archived: true,
      });

      return { message: "Collection record archived successfully" };
    } catch (error) {
      console.log("error", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to archive collection record: ${error.message}`);
    }
  }

  /**
   * Update donation box statistics after collection
   */
  private async updateDonationBoxStats(
    boxId: number,
    amount: number,
    collectionDate: Date,
  ): Promise<void> {
    try {
      const box = await this.donationBoxRepository.findOne({
        where: { id: boxId },
      });

      if (box) {
        box.total_collected = Number(box.total_collected) + Number(amount);
        box.collection_count = box.collection_count + 1;
        box.last_collection_date = collectionDate;

        await this.donationBoxRepository.save(box);
      }
    } catch (error) {
      console.error("Failed to update donation box stats:", error);
      // Don't throw error - collection should still succeed even if stats update fails
    }
  }

  /**
   * Get collection statistics for a donation box
   */
  async getBoxCollectionStats(boxId: number) {
    try {
      const collections = await this.donationBoxDonationRepository.find({
        where: { donation_box_id: boxId, is_archived: false },
      });

      const totalCollected = collections.reduce(
        (sum, col) => sum + Number(col.collection_amount),
        0,
      );
      const collectionCount = collections.length;
      const lastCollection = collections.sort(
        (a, b) =>
          new Date(b.collection_date).getTime() -
          new Date(a.collection_date).getTime(),
      )[0];

      return {
        boxId,
        totalCollected,
        collectionCount,
        lastCollectionDate: lastCollection?.collection_date || null,
        collections,
      };
    } catch (error) {
      console.log("error", error);
      throw new Error(`Failed to get collection stats: ${error.message}`);
    }
  }

  /**
   * Get a donation box by ID (for geographic access check in controller).
   */
  async getDonationBoxById(boxId: number): Promise<DonationBox | null> {
    return this.donationBoxRepository.findOne({ where: { id: boxId } });
  }

  async getDonationBoxDonationListForDropdown(options?: {
    donationBoxId?: number;
    status?: string;
  }) {
    const queryBuilder = this.donationBoxDonationRepository
      .createQueryBuilder("collection")
      .select([
        "collection.id",
        "collection.collection_amount",
        "collection.collection_date",
        "collection.status",
        "collection.donation_box_id",
      ]);

    if (options?.donationBoxId) {
      queryBuilder.andWhere("collection.donation_box_id = :donationBoxId", {
        donationBoxId: options.donationBoxId,
      });
    }

    if (options?.status) {
      queryBuilder.andWhere("collection.status = :status", {
        status: options.status,
      });
    }

    queryBuilder.orderBy("collection.collection_date", "DESC");

    const collections = await queryBuilder.getMany();

    return collections.map((collection) => ({
      id: collection.id,
      collection_amount: collection.collection_amount,
      collection_date: collection.collection_date,
      status: collection.status,
      donation_box_id: collection.donation_box_id,
    }));
  }
}
