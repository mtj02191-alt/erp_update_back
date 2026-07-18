import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonationInKindItem } from "./entities/donation_in_kind_item.entity";
import { CreateDonationInKindItemDto } from "./dto/create-donation_in_kind_item.dto";
import { UpdateDonationInKindItemDto } from "./dto/update-donation_in_kind_item.dto";
import {
  applyCommonFilters,
  FilterPayload,
  applyHybridFilters,
  HybridFilter,
} from "../../../utils/filters/common-filter.util";
import { ProcurementsService } from "src/procurements/services/procurements.service";
import { CreateProcurementsDto } from "src/procurements/dto/create-procurements.dto/create-procurements.dto";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  category?: string;
  condition?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

@Injectable()
export class DonationInKindItemsService {
  constructor(
    @InjectRepository(DonationInKindItem)
    private readonly donationInKindItemRepository: Repository<DonationInKindItem>,
    private readonly procurementsService: ProcurementsService,
  ) {}

  /**
   * Create a new donation in kind item
   */
  async create(
    createDonationInKindItemDto: CreateDonationInKindItemDto,
  ): Promise<DonationInKindItem> {
    try {
      // Check if item code already exists
      const existingItem = await this.donationInKindItemRepository.findOne({
        where: { name: createDonationInKindItemDto.name },
      });

      if (existingItem) {
        throw new ConflictException(
          `Item with name ${createDonationInKindItemDto.name} already exists`,
        );
      }

      // Validate estimated value
      if (
        createDonationInKindItemDto.estimated_value &&
        createDonationInKindItemDto.estimated_value < 0
      ) {
        throw new BadRequestException("Estimated value cannot be negative");
      }

      // Create the item
      const item = this.donationInKindItemRepository.create(
        createDonationInKindItemDto,
      );

      const savedItem = await this.donationInKindItemRepository.save(item);

      // Automatically create purchase (procurement) record
      if (createDonationInKindItemDto.store_id) {
        try {
          const purchaseDto: CreateProcurementsDto = {
            date: new Date(),
            totalGeneratedPOs: 0,
            pendingPOs: 0,
            fulfilledPOs: 0,
            totalGeneratedPIs: 0,
            totalPaidAmount: 0,
            unpaidAmount: 0,
            unpaidPIs: 0,
            tenders: 0,
            storeId: createDonationInKindItemDto.store_id,
          };
          await this.procurementsService.create(purchaseDto);
        } catch (error) {
          console.error("Failed to create automatic purchase record:", error);
          // Don't throw error - item creation should succeed even if purchase creation fails
        }
      }

      // Return the created item
      return await this.donationInKindItemRepository.findOne({
        where: { id: savedItem.id },
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(
        `Failed to create donation in kind item: ${error.message}`,
      );
    }
  }

  /**
   * Find all donation in kind items with pagination and filtering
   */
  async findAll(options: PaginationOptions): Promise<{
    data: DonationInKindItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortField = "created_at",
        sortOrder = "DESC",
        search,
        category,
        condition,
        status,
        start_date,
        end_date,
      } = options;

      // Build query
      const queryBuilder =
        this.donationInKindItemRepository.createQueryBuilder("item");

      // Apply filters
      const filters: FilterPayload = {
        search,
        start_date,
        end_date,
      };

      // Apply common filters (search, date range)
      // applyCommonFilters(queryBuilder, filters, '[item]');

      // Apply specific filters
      if (category) {
        queryBuilder.andWhere("item.category = :category", { category });
      }

      if (condition) {
        queryBuilder.andWhere("item.condition = :condition", { condition });
      }

      if (status) {
        queryBuilder.andWhere("item.status = :status", { status });
      }

      // Apply sorting
      const allowedSortFields = [
        "name",
        "category",
        "condition",
        "status",
        "quantity",
        "estimated_value",
        "created_at",
        "updated_at",
      ];

      if (allowedSortFields.includes(sortField)) {
        queryBuilder.orderBy(`item.${sortField}`, sortOrder);
      } else {
        queryBuilder.orderBy("item.created_at", "DESC");
      }

      // Apply pagination
      const skip = (page - 1) * pageSize;
      queryBuilder.skip(skip).take(pageSize);

      // Execute query
      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve donation in kind items: ${error.message}`,
      );
    }
  }

  /**
   * Find one donation in kind item by ID
   */
  async findOne(id: number): Promise<DonationInKindItem> {
    try {
      const item = await this.donationInKindItemRepository.findOne({
        where: { id },
      });

      if (!item) {
        throw new NotFoundException(
          `Donation in kind item with ID ${id} not found`,
        );
      }

      return item;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Failed to retrieve donation in kind item: ${error.message}`,
      );
    }
  }

  /**
   * Update a donation in kind item
   */
  async update(
    id: number,
    updateDonationInKindItemDto: UpdateDonationInKindItemDto,
  ): Promise<DonationInKindItem> {
    try {
      const item = await this.donationInKindItemRepository.findOne({
        where: { id },
      });

      if (!item) {
        throw new NotFoundException(
          `Donation in kind item with ID ${id} not found`,
        );
      }

      // Check if item code is being changed and if it already exists
      if (
        updateDonationInKindItemDto.name &&
        updateDonationInKindItemDto.name !== item.name
      ) {
        const existingItem = await this.donationInKindItemRepository.findOne({
          where: { name: updateDonationInKindItemDto.name },
        });

        if (existingItem) {
          throw new ConflictException(
            `Item with name ${updateDonationInKindItemDto.name} already exists`,
          );
        }
      }

      // Validate estimated value
      if (
        updateDonationInKindItemDto.estimated_value &&
        updateDonationInKindItemDto.estimated_value < 0
      ) {
        throw new BadRequestException("Estimated value cannot be negative");
      }

      // Update the entity
      await this.donationInKindItemRepository.update(
        id,
        updateDonationInKindItemDto,
      );

      // Return updated entity
      return await this.donationInKindItemRepository.findOne({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(
        `Failed to update donation in kind item: ${error.message}`,
      );
    }
  }

  /**
   * Soft delete a donation in kind item (archive)
   */
  async remove(id: number): Promise<void> {
    try {
      const item = await this.donationInKindItemRepository.findOne({
        where: { id },
      });

      if (!item) {
        throw new NotFoundException(
          `Donation in kind item with ID ${id} not found`,
        );
      }

      // Soft delete by setting is_archived to true
      await this.donationInKindItemRepository.update(id, { is_archived: true });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(
        `Failed to delete donation in kind item: ${error.message}`,
      );
    }
  }

  /**
   * Find items by category
   */
  async findByCategory(category: string): Promise<DonationInKindItem[]> {
    try {
      return await this.donationInKindItemRepository.find({
        where: { category: category as any },
        order: { created_at: "DESC" },
      });
    } catch (error) {
      throw new Error(`Failed to retrieve items by category: ${error.message}`);
    }
  }

  /**
   * Get item statistics
   */
  async getStatistics() {
    try {
      // const totalItems = await this.donationInKindItemRepository.count();
      // const availableItems = await this.donationInKindItemRepository.count({
      //   where: { status: 'available' },
      // });
      // const distributedItems = await this.donationInKindItemRepository.count({
      //   where: { status: 'distributed' },
      // });
      // const damagedItems = await this.donationInKindItemRepository.count({
      //   where: { status: 'damaged' },
      // });
      // const disposedItems = await this.donationInKindItemRepository.count({
      //   where: { status: 'disposed' },
      // });
      // // Get category breakdown
      // const categoryBreakdown = await this.donationInKindItemRepository
      //   .createQueryBuilder('item')
      //   .select('item.category', 'category')
      //   .addSelect('COUNT(*)', 'count')
      //   .groupBy('item.category')
      //   .getRawMany();
      // return {
      //   totalItems,
      //   availableItems,
      //   distributedItems,
      //   damagedItems,
      //   disposedItems,
      //   categoryBreakdown,
      // };
    } catch (error) {
      throw new Error(`Failed to retrieve statistics: ${error.message}`);
    }
  }
}
