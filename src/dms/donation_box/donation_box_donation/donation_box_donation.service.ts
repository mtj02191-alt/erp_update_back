import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, SelectQueryBuilder } from "typeorm";
import { DonationBoxDonation } from "./entities/donation_box_donation.entity";
import { CreateDonationBoxDonationDto } from "./dto/create-donation_box_donation.dto";
import { UpdateDonationBoxDonationDto } from "./dto/update-donation_box_donation.dto";
import { DonationBox } from "../entities/donation-box.entity";
import {
  applyCommonFilters,
  FilterPayload,
  applyHybridFilters,
  HybridFilter,
} from "../../../utils/filters/common-filter.util";
import { User } from "../../../users/user.entity";
import { DashboardAggregateService } from "../../../dashboard/dashboard-aggregate.service";
import { CollectionStatus } from "./entities/donation_box_donation.entity";
import { DonationBoxDonationAuditService } from "./audit/donation-box-donation-audit.service";
import { DonationBoxDonationAuditAction } from "./audit/donation-box-donation-audit-action.enum";
import { DonationBoxDonationAuditSource } from "./audit/donation-box-donation-audit-source.enum";
import {
  buildDonationBoxDonationFieldChanges,
} from "./audit/donation-box-donation-audit.util";
import { DataScopeService } from "../../../permissions/data-scope/data-scope.service";
import { ResolvedDataScope } from "../../../permissions/data-scope/data-scope.types";
import { GeographicScopeService } from "../../../permissions/geographic-scope/geographic-scope.service";
import { ResolvedGeographicScope } from "../../../permissions/geographic-scope/geographic-scope.types";
import { DonationBoxGeoRecord } from "../../../permissions/geographic-scope/geographic-scope.types";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  donation_box_id?: number;
  status?: string;
  payment_method?: string;
  min_amount?: string | number;
  max_amount?: string | number;
  date?: string;
  start_date?: string;
  end_date?: string;
  team_filter?: string;
  team_filter_user_id?: string | number;
}

@Injectable()
export class DonationBoxDonationService {
  constructor(
    @InjectRepository(DonationBoxDonation)
    private readonly donationBoxDonationRepository: Repository<DonationBoxDonation>,
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dashboardAggregateService: DashboardAggregateService,
    private readonly donationBoxDonationAuditService: DonationBoxDonationAuditService,
    private readonly dataScopeService: DataScopeService,
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  async resolveCollectionScope(currentUser?: {
    id?: number;
    role?: string;
    department?: string;
  }): Promise<ResolvedDataScope> {
    return this.dataScopeService.resolveScope(
      currentUser?.id,
      currentUser?.role,
      currentUser?.department,
      "fund_raising",
      "donation_box_donations",
    );
  }

  assertCollectionRecordAccess(
    scope: ResolvedDataScope,
    record: DonationBoxDonation,
  ): void {
    // Treat collector as co-owner (same pattern as donor.assigned_to).
    this.dataScopeService.assertRecordAccess(
      scope,
      {
        created_by: record.created_by,
        assigned_to:
          record.collected_by ??
          (record.collected_by_id != null
            ? ({ id: record.collected_by_id } as any)
            : null),
      },
      { useAssignedTo: true },
    );
  }

  private toDonationBoxGeoRecord(box: DonationBox): DonationBoxGeoRecord {
    return {
      city_id: box.city_id,
      route_id: box.route_id,
      landmark_marketplace: box.landmark_marketplace,
      geo_search: box.geo_search,
      created_by: box.created_by,
    };
  }

  /**
   * Data access (self/team/…) is always enforced.
   * Geographic territory is an additional filter when active — it must not
   * replace Access Scope (previously geo skipped data scope entirely).
   */
  assertCollectionViewAccess(
    dataScope: ResolvedDataScope,
    record: DonationBoxDonation,
    geoScope?: ResolvedGeographicScope | null,
  ): void {
    this.assertCollectionRecordAccess(dataScope, record);

    if (
      geoScope &&
      this.geographicScopeService.isGeographicFilterActive(geoScope)
    ) {
      const box = record.donation_box;
      if (
        !box ||
        !this.geographicScopeService.recordMatches(geoScope, "donation_box_donations", {
          donation_box: this.toDonationBoxGeoRecord(box),
          created_by: record.created_by,
          collected_by: record.collected_by,
          collected_by_id: record.collected_by_id,
        })
      ) {
        throw new ForbiddenException(
          "You do not have geographic access to this record",
        );
      }
    }
  }

  /**
   * Access Scope on created_by OR collected_by.
   * Applied even when geographic filters are active (geo is additive).
   */
  private applyCollectionListDataScope(
    query: SelectQueryBuilder<DonationBoxDonation>,
    dataScope: ResolvedDataScope | null,
    _geoScope?: ResolvedGeographicScope | null,
  ): void {
    if (!dataScope) return;
    this.dataScopeService.applyToQuery(
      query,
      "donation_box_donation",
      dataScope,
      { assignedToColumn: "donation_box_donation.collected_by_id" },
    );
  }

  /** Staff user id for created_by / updated_by. */
  private donationBoxDonationAuditUserId(
    userId: number | null | undefined,
  ): number | null {
    if (userId == null || Number(userId) === -1) return null;
    return Number(userId);
  }

  private buildDonationBoxDonationPatch(
    dto: UpdateDonationBoxDonationDto,
  ): Record<string, unknown> {
    const d = dto as Record<string, unknown>;
    const allowed = [
      "donation_box_id",
      "collection_amount",
      "collection_date",
      "collected_by_id",
      "collector_name",
      "status",
      "verified_by_id",
      "verified_at",
      "deposit_date",
      "bank_deposit_slip_no",
      "payment_method",
      "cheque_number",
      "bank_name",
      "bank_account_no",
      "notes",
      "discrepancy_notes",
      "photo_urls",
      "receipt_number",
      "is_archived",
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (d[key] === undefined) continue;
      patch[key] = d[key];
    }
    return patch;
  }

  async getDonationBoxDonationAuditHistory(donationBoxDonationId: number) {
    return this.donationBoxDonationAuditService.findByDonationBoxDonationId(
      donationBoxDonationId,
    );
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

      const auditUserId = this.donationBoxDonationAuditUserId(currentUserId);
      if (!createDonationBoxDonationDto.collected_by_id && auditUserId) {
        createDonationBoxDonationDto.collected_by_id = auditUserId;
      }

      const collection = this.donationBoxDonationRepository.create({
        ...createDonationBoxDonationDto,
        ...(auditUserId != null
          ? { created_by: { id: auditUserId } as any }
          : {}),
      });

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
        relations: [
          "donation_box",
          "collected_by",
          "verified_by",
          "created_by",
          "updated_by",
        ],
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
   * Resolve parent donation box for CSV import.
   */
  async resolveDonationBoxIdForImport(params: {
    donation_box_id?: number;
    key_no?: string;
    shop_name?: string;
  }): Promise<number> {
    if (params.donation_box_id) {
      const box = await this.donationBoxRepository.findOne({
        where: { id: params.donation_box_id, is_archived: false },
      });
      if (!box) {
        throw new NotFoundException(
          `Donation box with ID ${params.donation_box_id} not found`,
        );
      }
      return box.id;
    }

    const keyNo = params.key_no?.trim();
    if (keyNo) {
      const box = await this.donationBoxRepository.findOne({
        where: { key_no: keyNo, is_archived: false },
      });
      if (!box) {
        throw new NotFoundException(
          `Donation box with key "${keyNo}" not found`,
        );
      }
      return box.id;
    }

    const shopName = params.shop_name?.trim();
    if (shopName) {
      const boxes = await this.donationBoxRepository.find({
        where: { shop_name: ILike(shopName), is_archived: false },
      });
      if (boxes.length === 0) {
        throw new NotFoundException(
          `Donation box with shop "${shopName}" not found`,
        );
      }
      if (boxes.length > 1) {
        throw new NotFoundException(
          `Multiple boxes match shop "${shopName}" — use donation_box_id or key_no`,
        );
      }
      return boxes[0].id;
    }

    throw new BadRequestException(
      "donation_box_id, key_no, or shop_name is required",
    );
  }

  /**
   * CSV / data-import row — same persistence rules as create().
   */
  async importDonationBoxDonationRow(
    row: Record<string, unknown>,
    user: any,
  ): Promise<DonationBoxDonation> {
    const donation_box_id = await this.resolveDonationBoxIdForImport({
      donation_box_id: row.donation_box_id as number | undefined,
      key_no: row.key_no as string | undefined,
      shop_name: row.shop_name as string | undefined,
    });

    const amount = Number(row.collection_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        "collection_amount must be greater than 0",
      );
    }

    const createDto = {
      donation_box_id,
      collection_amount: amount,
      collection_date: row.collection_date,
      collector_name: row.collector_name as string | undefined,
      collected_by_id: row.collected_by_id as number | undefined,
      notes: row.notes as string | undefined,
      payment_method: row.payment_method,
      status: row.status,
      receipt_number: row.receipt_number as string | undefined,
    } as CreateDonationBoxDonationDto;

    return this.create(createDto, user?.id);
  }

  private applyCollectionDateFilter(
    query: SelectQueryBuilder<DonationBoxDonation>,
    filters: {
      date?: string;
      start_date?: string;
      end_date?: string;
    },
  ): void {
    const dateField = "donation_box_donation.collection_date";
    if (filters.start_date && filters.end_date) {
      query.andWhere(`${dateField} BETWEEN :cbdStartDate AND :cbdEndDate`, {
        cbdStartDate: filters.start_date,
        cbdEndDate: filters.end_date,
      });
    } else if (filters.start_date) {
      query.andWhere(`${dateField} >= :cbdStartDate`, {
        cbdStartDate: filters.start_date,
      });
    } else if (filters.end_date) {
      query.andWhere(`${dateField} <= :cbdEndDate`, {
        cbdEndDate: filters.end_date,
      });
    } else if (filters.date) {
      query.andWhere(`${dateField} = :cbdExactDate`, {
        cbdExactDate: filters.date,
      });
    }
  }

  /**
   * Find all collections with pagination and filtering
   */
  async findAll(
    options: PaginationOptions,
    geoScope?: ResolvedGeographicScope | null,
    currentUser?: { id?: number; role?: string; department?: string },
  ) {
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
        min_amount,
        max_amount,
        date = "",
        start_date,
        end_date,
        team_filter,
        team_filter_user_id,
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
        "donation_box.shop_name",
        "donation_box.key_no",
        "donation_box.box_id_no",
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
      };

      if (donation_box_id) {
        filters.donation_box_id = donation_box_id;
      }

      applyCommonFilters(query, filters, searchFields, "donation_box_donation");

      this.applyCollectionDateFilter(query, { date, start_date, end_date });

      const hybridFilters: HybridFilter[] = [];
      const minAmount = Number(min_amount);
      if (Number.isFinite(minAmount)) {
        hybridFilters.push({
          column: "collection_amount",
          operator: "gte",
          value: minAmount,
        });
      }
      const maxAmount = Number(max_amount);
      if (Number.isFinite(maxAmount)) {
        hybridFilters.push({
          column: "collection_amount",
          operator: "lte",
          value: maxAmount,
        });
      }
      if (hybridFilters.length) {
        applyHybridFilters(query, hybridFilters, "donation_box_donation");
      }

      if (geoScope) {
        this.geographicScopeService.applyToQuery(
          query,
          "donation_box_donations",
          "donation_box_donation",
          geoScope,
          { donationBoxAlias: "donation_box" },
        );
      }

      if (currentUser?.id) {
        const scope = await this.dataScopeService.resolveListScope({
          userId: currentUser.id,
          userRole: currentUser.role,
          userDepartment: currentUser.department,
          permissionDepartment: "fund_raising",
          module: "donation_box_donations",
          teamFilter: team_filter,
          teamFilterUserId: team_filter_user_id,
        });
        this.applyCollectionListDataScope(query, scope, geoScope);
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
        relations: [
          "donation_box",
          "collected_by",
          "verified_by",
          "created_by",
          "updated_by",
        ],
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

      const auditUserId = this.donationBoxDonationAuditUserId(currentUserId);
      if (
        updateDonationBoxDonationDto.collected_by_id === undefined &&
        auditUserId
      ) {
        updateDonationBoxDonationDto.collected_by_id = auditUserId;
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

      const patch = this.buildDonationBoxDonationPatch(
        updateDonationBoxDonationDto,
      );
      if (auditUserId != null) {
        patch.updated_by = auditUserId;
      }

      const auditChanges = buildDonationBoxDonationFieldChanges(
        collection as unknown as Record<string, unknown>,
        patch,
      );

      if (Object.keys(patch).length > 0) {
        await this.donationBoxDonationRepository.update(id, patch as any);
      }

      if (auditChanges.length > 0) {
        const action = auditChanges.some((c) => c.field === "status")
          ? DonationBoxDonationAuditAction.STATUS_CHANGED
          : DonationBoxDonationAuditAction.UPDATED;
        await this.donationBoxDonationAuditService.log({
          donationBoxDonationId: id,
          action,
          source: DonationBoxDonationAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      return await this.donationBoxDonationRepository.findOne({
        where: { id },
        relations: [
          "donation_box",
          "collected_by",
          "verified_by",
          "created_by",
          "updated_by",
        ],
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
  async remove(id: number, currentUserId?: number) {
    try {
      const collection = await this.donationBoxDonationRepository.findOne({
        where: { id },
      });

      if (!collection) {
        throw new NotFoundException(
          `Collection record with ID ${id} not found`,
        );
      }

      const auditUserId = this.donationBoxDonationAuditUserId(currentUserId);
      const archivePatch: Record<string, unknown> = { is_archived: true };
      if (auditUserId != null) {
        archivePatch.updated_by = auditUserId;
      }

      const auditChanges = buildDonationBoxDonationFieldChanges(
        collection as unknown as Record<string, unknown>,
        archivePatch,
      );

      if (auditChanges.length > 0) {
        await this.donationBoxDonationAuditService.log({
          donationBoxDonationId: id,
          action: DonationBoxDonationAuditAction.ARCHIVED,
          source: DonationBoxDonationAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
          metadata: {
            collection_amount: collection.collection_amount,
            donation_box_id: collection.donation_box_id,
          },
        });
      }

      await this.donationBoxDonationRepository.update(id, archivePatch as any);

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
    return this.donationBoxRepository.findOne({
      where: { id: boxId },
      relations: ["created_by"],
    });
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
