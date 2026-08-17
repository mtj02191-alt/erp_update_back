import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { Donor, DonorType } from "./entities/donor.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { CreateDonorDto } from "./dto/create-donor.dto";
import { UpdateDonorDto } from "./dto/update-donor.dto";
import { ChangePipelineStageDto } from "./dto/change-pipeline-stage.dto";
import {
  applyCommonFilters,
  applyHybridFilters,
  FilterPayload,
} from "../../utils/filters/common-filter.util";
import * as bcrypt from "bcrypt";
import { User } from "src/users/user.entity";
import { UsersService } from "src/users/users.service";
import { DashboardAggregateService } from "../../dashboard/dashboard-aggregate.service";
import {
  decryptDonorPassword,
  encryptDonorPassword,
  generateRandomPassword,
} from "src/utils/crypto/donor-password-vault";
import { DonorAuditService } from "./audit/donor-audit.service";
import { DonorAuditAction } from "./audit/donor-audit-action.enum";
import { DonorAuditSource } from "./audit/donor-audit-source.enum";
import {
  DONOR_AUDIT_SENSITIVE_FIELDS,
} from "./audit/donor-audit.constants";
import { buildDonorFieldChanges } from "./audit/donor-audit.util";
import { DataScopeService } from "../../permissions/data-scope/data-scope.service";
import { ResolvedDataScope } from "../../permissions/data-scope/data-scope.types";
import { GeographicScopeService } from "../../permissions/geographic-scope/geographic-scope.service";
import { ResolvedGeographicScope } from "../../permissions/geographic-scope/geographic-scope.types";
import { PermissionsService } from "../../permissions/permissions.service";
import { buildDonorGeoSearch } from "./utils/donor-geo.util";
import { DonorPipelineStageHistory } from "./pipeline/entities/donor-pipeline-stage-history.entity";
import {
  DonorPipelineStage,
  isValidDonorPipelineStage,
  resolveDonorPipelineStage,
} from "./pipeline/donor-pipeline.constants";
import { OrganizationsService } from "../organizations/organizations.service";
import { OrganizationAffiliationRole } from "../organizations/entities/donor-organization-affiliation.entity";

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

export interface DonorDonationStats {
  total_donations: number;
  total_donated: number;
  currency: string;
  first_donation: {
    date: Date | string;
    amount: number;
    currency: string;
  } | null;
  last_donation: {
    date: Date | string;
    amount: number;
    currency: string;
  } | null;
}

@Injectable()
export class DonorService {
  constructor(
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(DonorPipelineStageHistory)
    private readonly pipelineHistoryRepository: Repository<DonorPipelineStageHistory>,
    private readonly usersService: UsersService,
    private readonly dashboardAggregateService: DashboardAggregateService,
    private readonly donorAuditService: DonorAuditService,
    private readonly dataScopeService: DataScopeService,
    private readonly geographicScopeService: GeographicScopeService,
    private readonly permissionsService: PermissionsService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getDonorSourceAccess(
    userId: number,
    action: string,
  ): Promise<{ online: boolean; offline: boolean }> {
    if (userId === -1) return { online: true, offline: true };

    const hasSuperAdmin = await this.permissionsService.hasPermission(
      userId,
      "super_admin",
    );
    if (hasSuperAdmin) return { online: true, offline: true };

    const hasFundRaisingManager = await this.permissionsService.hasPermission(
      userId,
      "fund_raising_manager",
    );
    if (hasFundRaisingManager) return { online: true, offline: true };

    const hasUnifiedDonors = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.donors.${action}`,
    );
    if (hasUnifiedDonors) return { online: true, offline: true };

    const hasOnline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.online_donors.${action}`,
    );
    const hasOffline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.offline_donors.${action}`,
    );

    return { online: hasOnline, offline: hasOffline };
  }

  async resolveGeoScopeForUser(user: {
    id?: number;
    role?: string;
    department?: string;
    assigned_countries?: number[] | null;
    assigned_regions?: number[] | null;
    assigned_districts?: number[] | null;
    assigned_tehsils?: number[] | null;
    assigned_cities?: number[] | null;
    assigned_routes?: number[] | null;
    geographic_off?: boolean;
  } | null): Promise<ResolvedGeographicScope | null> {
    if (!user?.id || user.id === -1) return null;
    return this.geographicScopeService.resolveForUser(
      user.id,
      user.role,
      user as any,
    );
  }

  async resolveCommunicationAudience(
    user: { id?: number; role?: string; department?: string } | null | undefined,
    payload: {
      selection_mode: "manual" | "filters";
      donor_ids?: number[];
      donor_filters?: Record<string, any>;
    },
  ) {
    let sourceAccess = { online: true, offline: true };
    if (user?.id) {
      sourceAccess = await this.getDonorSourceAccess(user.id, "list_view");
      if (!sourceAccess.online && !sourceAccess.offline) {
        throw new ForbiddenException("Insufficient permissions to view donors");
      }
    }
    const geoScope = await this.resolveGeoScopeForUser(user);
    return this.resolveAudienceIds(payload, geoScope, sourceAccess, user ?? undefined);
  }

  async resolveDonorScope(currentUser?: {
    id?: number;
    role?: string;
    department?: string;
  }): Promise<ResolvedDataScope> {
    return this.dataScopeService.resolveScope(
      currentUser?.id,
      currentUser?.role,
      currentUser?.department,
      "fund_raising",
      "donors",
    );
  }

  assertDonorRecordAccess(scope: ResolvedDataScope, record: Donor): void {
    this.dataScopeService.assertRecordAccess(scope, record, {
      useAssignedTo: true,
    });
  }

  private toDonorGeoRecord(donor: Donor) {
    return {
      city: donor.city,
      country: donor.country,
      address: donor.address,
      geo_search: donor.geo_search,
      created_by: donor.created_by,
    };
  }

  /**
   * When geographic territory filter is active, geo match governs access.
   * Otherwise fall back to data scope (created_by / assigned_to).
   */
  assertDonorViewAccess(
    dataScope: ResolvedDataScope,
    donor: Donor,
    geoScope?: ResolvedGeographicScope | null,
  ): void {
    if (geoScope && this.geographicScopeService.isGeographicFilterActive(geoScope)) {
      if (
        !this.geographicScopeService.recordMatches(
          geoScope,
          "donors",
          this.toDonorGeoRecord(donor),
        )
      ) {
        throw new ForbiddenException(
          "You do not have geographic access to this record",
        );
      }
      return;
    }

    this.assertDonorRecordAccess(dataScope, donor);
  }

  private applyDonorListDataScope(
    query: SelectQueryBuilder<Donor>,
    dataScope: ResolvedDataScope | null,
    geoScope?: ResolvedGeographicScope | null,
  ): void {
    if (!dataScope) return;
    if (
      geoScope &&
      this.geographicScopeService.isGeographicFilterActive(geoScope)
    ) {
      return;
    }
    this.dataScopeService.applyToQuery(query, "donor", dataScope, {
      assignedToColumn: "donor.assigned_to",
    });
  }

  private donorAuditUserId(userId: number | null | undefined): number | null {
    if (userId == null || Number(userId) === -1) return null;
    return Number(userId);
  }

  private applyGeoSearchToDonor(donor: Donor): void {
    donor.geo_search = buildDonorGeoSearch(donor);
  }

  private donorAuditSnapshot(donor: Donor): Record<string, unknown> {
    return {
      donor_type: donor.donor_type,
      email: donor.email,
      phone: donor.phone,
      cnic: donor.cnic,
      source: donor.source,
      address: donor.address,
      city: donor.city,
      country: donor.country,
      postal_code: donor.postal_code,
      notes: donor.notes,
      name: donor.name,
      first_name: donor.first_name,
      last_name: donor.last_name,
      date_of_birth: donor.date_of_birth,
      is_active: donor.is_active,
      is_archived: donor.is_archived,
      recurring: donor.recurring,
      recurring_consent: donor.recurring_consent,
      recurring_consent_at: donor.recurring_consent_at,
      multi_time_donor: donor.multi_time_donor,
      notification_subscription: donor.notification_subscription,
      pipeline_stage: donor.pipeline_stage,
      pipeline_ask_amount: donor.pipeline_ask_amount,
      pipeline_pledge_amount: donor.pipeline_pledge_amount,
      pipeline_amount_currency: donor.pipeline_amount_currency,
      assigned_to_user_id: donor.assigned_to?.id ?? null,
      referrer_user_id: donor.referred_by?.id ?? null,
    };
  }

  private withEffectivePipelineStage<T extends Donor>(
    donor: T,
  ): T & { effective_pipeline_stage: DonorPipelineStage } {
    return Object.assign(donor, {
      effective_pipeline_stage: resolveDonorPipelineStage(donor.pipeline_stage),
    });
  }

  private buildDonorPatch(dto: UpdateDonorDto): Record<string, unknown> {
    const d = dto as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(d)) {
      if (d[key] === undefined || DONOR_AUDIT_SENSITIVE_FIELDS.has(key)) {
        continue;
      }
      patch[key] = d[key];
    }
    return patch;
  }

  async getDonorAuditHistory(donorId: number) {
    return this.donorAuditService.findByDonorId(donorId);
  }

  /**
   * Resolve org for affiliation. Never deletes/overwrites other donors.
   */
  private async resolveOrganizationForDonorLink(opts: {
    organization_id?: number | null;
  }) {
    if (opts.organization_id) {
      return this.organizationsService.findOne(Number(opts.organization_id));
    }
    return null;
  }

  private async linkDonorToOrganization(
    donor: Donor,
    opts: {
      organization_id?: number | null;
      organization_branch_id?: number | null;
      affiliation_role?: OrganizationAffiliationRole | string;
      affiliation_is_primary?: boolean;
    },
  ): Promise<Donor> {
    const org = await this.resolveOrganizationForDonorLink({
      organization_id: opts.organization_id,
    });
    if (!org) return donor;

    await this.organizationsService.createAffiliation({
      donor_id: donor.id,
      organization_id: org.id,
      branch_id: opts.organization_branch_id
        ? Number(opts.organization_branch_id)
        : undefined,
      role:
        (opts.affiliation_role as OrganizationAffiliationRole) ||
        OrganizationAffiliationRole.CONTACT,
      is_primary: opts.affiliation_is_primary !== false,
    });

    return donor;
  }

  /**
   * Create a new donor (individual or CSR)
   */
  async register(createDonorDto: CreateDonorDto, user: any): Promise<Donor> {
    try {
      if (
        createDonorDto.donor_type === DonorType.CSR &&
        !createDonorDto.organization_id
      ) {
        throw new BadRequestException(
          "Organization is required for CSR donors",
        );
      }

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
      const auditUserId = this.donorAuditUserId(user?.id);
      const {
        assigned_to_user_id: _assigned,
        referrer_user_id: _referrer,
        pipeline_stage: requestedStage,
        organization_id,
        organization_branch_id,
        affiliation_role,
        affiliation_is_primary,
        ...donorFields
      } = createDonorDto as CreateDonorDto & {
        assigned_to_user_id?: number;
        referrer_user_id?: number;
        pipeline_stage?: DonorPipelineStage;
        organization_id?: number;
        organization_branch_id?: number;
        affiliation_role?: OrganizationAffiliationRole;
        affiliation_is_primary?: boolean;
      };

      const initialStage =
        requestedStage && isValidDonorPipelineStage(requestedStage)
          ? requestedStage
          : null;

      const donor = this.donorRepository.create({
        ...donorFields,
        password: hashedPassword,
        password_enc: enc.payload,
        password_enc_version: enc.version,
        assigned_to,
        referred_by,
        pipeline_stage: initialStage,
        pipeline_stage_changed_at: initialStage ? new Date() : null,
        pipeline_stage_changed_by_id: initialStage ? auditUserId : null,
        ...(auditUserId != null
          ? { created_by: { id: auditUserId } as any }
          : {}),
      });

      this.applyGeoSearchToDonor(donor);

      // Save and return
      let savedDonor = await this.donorRepository.save(donor);

      // Org link: required for CSR; optional for individual.
      if (organization_id) {
        savedDonor = await this.linkDonorToOrganization(savedDonor, {
          organization_id,
          organization_branch_id,
          affiliation_role,
          affiliation_is_primary,
        });
      }

      if (initialStage) {
        await this.pipelineHistoryRepository.save(
          this.pipelineHistoryRepository.create({
            donor_id: savedDonor.id,
            from_stage: null,
            to_stage: initialStage,
            reason: "Initial pipeline stage on registration",
            transition_type: "advanced",
            changed_by_id: auditUserId,
          }),
        );
      }

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      // Remove password from response
      delete savedDonor.password;
      delete (savedDonor as any).password_enc;

      return this.withEffectivePipelineStage(savedDonor);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new ConflictException(`Failed to create donor: ${error.message}`);
    }
  }

  /**
   * CSV / data-import row — same persistence rules as register(), no HTTP DTO validation.
   */
  async importDonorRow(
    row: Record<string, any>,
    user: any,
  ): Promise<Donor> {
    const createDonorDto = {
      donor_type: row.donor_type,
      email: String(row.email || "")
        .trim()
        .toLowerCase(),
      phone: String(row.phone || "").trim(),
      password: row.password,
      source: row.source,
      address: row.address,
      city: row.city,
      country: row.country,
      postal_code: row.postal_code,
      notes: row.notes,
      name: row.name,
      first_name: row.first_name,
      last_name: row.last_name,
      cnic: row.cnic,
      organization_id: row.organization_id,
      organization_branch_id: row.organization_branch_id,
      affiliation_role: row.affiliation_role,
      assigned_to_user_id: row.assigned_to_user_id,
      referrer_user_id: row.referrer_user_id,
    } as CreateDonorDto;

    const saved = await this.register(createDonorDto, user);

    const patch: Partial<Donor> = {};
    if (row.is_active !== undefined) patch.is_active = row.is_active;
    if (row.notification_subscription !== undefined) {
      patch.notification_subscription = row.notification_subscription;
    }
    if (row.recurring !== undefined) patch.recurring = row.recurring;
    if (row.multi_time_donor !== undefined) {
      patch.multi_time_donor = row.multi_time_donor;
    }

    if (Object.keys(patch).length > 0) {
      await this.donorRepository.update(saved.id, patch);
      Object.assign(saved, patch);
    }

    return saved;
  }

  /**
   * Find all donors with pagination and filtering
   */
  async findAll(
    options: any,
    geoScope?: ResolvedGeographicScope | null,
    sourceAccess?: { online: boolean; offline: boolean },
    currentUser?: { id?: number; role?: string; department?: string },
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
        recurring,
        is_mature_donor,
        source,
        donated_amount,
        donated_amount_operator,
        pipeline_stage,
      } = options;

      const skip = (page - 1) * pageSize;

      // Define searchable fields based on donor type
      const searchFields = [
        "name",
        "first_name",
        "last_name",
        "email",
        "phone",
        "city",
        "country",
        "geo_search",
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

      if (recurring === true) {
        queryBuilder.andWhere("donor.recurring = :recurring", {
          recurring: true,
        });
      } else if (recurring === false) {
        queryBuilder.andWhere(
          "(donor.recurring = :recurring OR donor.recurring IS NULL)",
          { recurring: false },
        );
      }

      // Matured donors: at least one completed donation (live check, not flag-only)
      if (is_mature_donor === true) {
        queryBuilder.andWhere(
          `EXISTS (
            SELECT 1 FROM donations d
            WHERE d.donor_id = donor.id
              AND d.is_archived = false
              AND LOWER(COALESCE(d.status, '')) = 'completed'
          )`,
        );
      } else if (is_mature_donor === false) {
        queryBuilder.andWhere(
          `NOT EXISTS (
            SELECT 1 FROM donations d
            WHERE d.donor_id = donor.id
              AND d.is_archived = false
              AND LOWER(COALESCE(d.status, '')) = 'completed'
          )`,
        );
      }

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

      // NULL pipeline_stage = legacy donor (treated as "donor")
      if (pipeline_stage && isValidDonorPipelineStage(String(pipeline_stage))) {
        const stage = String(pipeline_stage);
        if (stage === DonorPipelineStage.DONOR) {
          queryBuilder.andWhere(
            "(donor.pipeline_stage = :pipelineStage OR donor.pipeline_stage IS NULL)",
            { pipelineStage: stage },
          );
        } else {
          queryBuilder.andWhere("donor.pipeline_stage = :pipelineStage", {
            pipelineStage: stage,
          });
        }
      }

      if (geoScope) {
        this.geographicScopeService.applyToQuery(
          queryBuilder,
          "donors",
          "donor",
          geoScope,
        );
      }

      if (currentUser?.id) {
        const scope = await this.resolveDonorScope(currentUser);
        this.applyDonorListDataScope(queryBuilder, scope, geoScope);
      }

      const parsedDonatedAmount = Number(
        String(donated_amount ?? "").replace(/,/g, ""),
      );
      if (
        donated_amount !== undefined &&
        donated_amount !== null &&
        donated_amount !== "" &&
        donated_amount_operator &&
        Number.isFinite(parsedDonatedAmount)
      ) {
        applyHybridFilters(
          queryBuilder,
          [
            {
              column: "total_donated",
              operator: donated_amount_operator,
              value: parsedDonatedAmount,
            },
          ],
          "donor",
        );
      }

      // Apply sorting
      const validSortFields = [
        "name",
        "email",
        "city",
        "country",
        "donor_type",
        "created_at",
        "total_donated",
        "donation_count",
        "last_donation_date",
        "pipeline_stage",
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
      data.forEach((donor) => {
        delete donor.password;
        this.withEffectivePipelineStage(donor);
      });

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
   * Resolve donor IDs for communication audience (filter-based or manual list).
   */
  async resolveAudienceIds(
    options: {
      selection_mode: "manual" | "filters";
      donor_ids?: number[];
      donor_filters?: Record<string, any>;
    },
    geoScope?: ResolvedGeographicScope | null,
    sourceAccess?: { online: boolean; offline: boolean },
    currentUser?: { id?: number; role?: string; department?: string },
  ): Promise<{ ids: number[]; total: number; filters: Record<string, any> | null }> {
    if (options.selection_mode === "manual") {
      const ids = (options.donor_ids || [])
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0);
      return { ids, total: ids.length, filters: null };
    }

    const raw = options.donor_filters || {};
    const filters = { ...raw };

    let recurring: boolean | undefined =
      filters.recurring === true || filters.recurring === "true"
        ? true
        : filters.recurring === false || filters.recurring === "false"
          ? false
          : undefined;

    if (recurring === undefined && filters.donation_type) {
      const dt = String(filters.donation_type).toLowerCase().trim();
      if (dt === "recurring_donor") recurring = true;
      else if (dt === "one_time_donor") recurring = false;
    }

    const listOptions = {
      page: 1,
      pageSize: 50000,
      sortField: "id",
      sortOrder: "ASC" as const,
      search: filters.search || "",
      donor_type: filters.donor_type || "",
      city: filters.city || "",
      country: filters.country || "",
      start_date: filters.start_date || "",
      end_date: filters.end_date || "",
      multi_time_donor:
        filters.multi_time_donors === true ||
        filters.multi_time_donors === "true"
          ? true
          : filters.multi_time_donors === false ||
              filters.multi_time_donors === "false"
            ? false
            : undefined,
      recurring,
      is_mature_donor:
        filters.is_mature_donor === true || filters.is_mature_donor === "true"
          ? true
          : filters.is_mature_donor === false ||
              filters.is_mature_donor === "false"
            ? false
            : undefined,
      source: filters.source || "",
      assigned_to_user_id: filters.assigned_to_user_id ?? "",
      donated_amount: filters.donated_amount || "",
      donated_amount_operator: filters.donated_amount_operator || "",
    };

    const result = await this.findAll(
      listOptions,
      geoScope,
      sourceAccess,
      currentUser,
    );

    const ids = (result.data || []).map((donor) => donor.id);
    return { ids, total: result.pagination?.total ?? ids.length, filters: raw };
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
    recurring?: boolean;
    recurring_consent?: boolean;
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
        recurring,
        recurring_consent,
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
        recurring: recurring === true,
        recurring_consent: recurring_consent === true,
        recurring_consent_at:
          recurring_consent === true ? new Date() : null,
      });

      this.applyGeoSearchToDonor(donor);

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

  async findOne(id: number): Promise<Donor & { donation_stats: DonorDonationStats }> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id, is_archived: false },
        relations: ["created_by", "updated_by", "assigned_to", "referred_by"],
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      const donation_stats = await this.buildDonorDonationStats(id);
      await this.applyDonorDonationStatsIfStale(donor, donation_stats);

      const organization_affiliations =
        await this.organizationsService.listAffiliationsForDonor(id);

      // Remove password from response
      delete donor.password;

      return Object.assign(this.withEffectivePipelineStage(donor), {
        donation_stats,
        organization_affiliations,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Failed to retrieve donor: ${error.message}`);
    }
  }

  async getPipelineHistory(donorId: number) {
    const donor = await this.donorRepository.findOne({
      where: { id: donorId, is_archived: false },
      select: ["id"],
    });
    if (!donor) {
      throw new NotFoundException(`Donor with ID ${donorId} not found`);
    }

    return this.pipelineHistoryRepository.find({
      where: { donor_id: donorId },
      relations: ["changed_by"],
      order: { created_at: "DESC", id: "DESC" },
    });
  }

  async getPipelineSummary(
    geoScope?: ResolvedGeographicScope | null,
    sourceAccess?: { online: boolean; offline: boolean },
    currentUser?: { id?: number; role?: string; department?: string },
  ) {
    const queryBuilder = this.donorRepository
      .createQueryBuilder("donor")
      .select("COALESCE(donor.pipeline_stage, 'donor')", "pipeline_stage")
      .addSelect("COUNT(donor.id)", "count")
      .where("donor.is_archived = :is_archived", { is_archived: false })
      .groupBy("COALESCE(donor.pipeline_stage, 'donor')");

    if (sourceAccess) {
      if (!sourceAccess.online && sourceAccess.offline) {
        queryBuilder.andWhere("COALESCE(donor.source, '') != 'website'");
      } else if (sourceAccess.online && !sourceAccess.offline) {
        queryBuilder.andWhere("donor.source = 'website'");
      }
    }

    if (geoScope) {
      this.geographicScopeService.applyToQuery(
        queryBuilder,
        "donors",
        "donor",
        geoScope,
      );
    }

    if (currentUser?.id) {
      const scope = await this.resolveDonorScope(currentUser);
      this.applyDonorListDataScope(queryBuilder, scope, geoScope);
    }

    const rows = await queryBuilder.getRawMany<{
      pipeline_stage: string;
      count: string;
    }>();

    const counts: Record<string, number> = {};
    for (const stage of Object.values(DonorPipelineStage)) {
      counts[stage] = 0;
    }
    for (const row of rows) {
      const key = resolveDonorPipelineStage(row.pipeline_stage);
      counts[key] = Number(row.count || 0);
    }

    return {
      counts,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    };
  }

  /**
   * Change CRM pipeline stage with a required reason (history preserved).
   * Does not touch donations.
   */
  async changePipelineStage(
    id: number,
    dto: ChangePipelineStageDto,
    user?: any,
  ) {
    if (!isValidDonorPipelineStage(dto.stage)) {
      throw new BadRequestException("Invalid pipeline stage");
    }

    const reason = String(dto.reason || "").trim();
    if (reason.length < 3) {
      throw new BadRequestException("Reason must be at least 3 characters");
    }

    const donor = await this.donorRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!donor) {
      throw new NotFoundException(`Donor with ID ${id} not found`);
    }

    const fromStage = resolveDonorPipelineStage(donor.pipeline_stage);
    const toStage = dto.stage;
    const isSame = fromStage === toStage;
    const transitionType =
      dto.transition_type || (isSame ? "noted" : "advanced");

    if (transitionType === "advanced" && isSame) {
      throw new BadRequestException(
        "Stage is unchanged. Use transition_type=noted to log why the contact did not progress.",
      );
    }

    const needsAmount =
      (toStage === DonorPipelineStage.ASK ||
        toStage === DonorPipelineStage.PLEDGE) &&
      transitionType === "advanced";

    const amountRaw = dto.amount;
    const amountNum =
      amountRaw === undefined || amountRaw === null || amountRaw === ("" as any)
        ? null
        : Number(amountRaw);

    if (needsAmount) {
      if (amountNum == null || !Number.isFinite(amountNum) || amountNum <= 0) {
        throw new BadRequestException(
          toStage === DonorPipelineStage.ASK
            ? "Ask amount is required when moving to Ask"
            : "Pledge amount is required when moving to Pledge",
        );
      }
    }

    const currency = String(dto.currency || donor.pipeline_amount_currency || "PKR")
      .trim()
      .toUpperCase()
      .slice(0, 8) || "PKR";

    const auditUserId = this.donorAuditUserId(user?.id);
    const before = this.donorAuditSnapshot(donor);
    const patchForAudit: Record<string, unknown> = {};

    if (transitionType === "advanced" || !donor.pipeline_stage) {
      donor.pipeline_stage = toStage;
      donor.pipeline_stage_changed_at = new Date();
      donor.pipeline_stage_changed_by_id = auditUserId;
      patchForAudit.pipeline_stage = toStage;

      if (amountNum != null && Number.isFinite(amountNum) && amountNum > 0) {
        donor.pipeline_amount_currency = currency;
        patchForAudit.pipeline_amount_currency = currency;
        if (toStage === DonorPipelineStage.ASK) {
          donor.pipeline_ask_amount = amountNum as any;
          patchForAudit.pipeline_ask_amount = amountNum;
        }
        if (toStage === DonorPipelineStage.PLEDGE) {
          donor.pipeline_pledge_amount = amountNum as any;
          patchForAudit.pipeline_pledge_amount = amountNum;
        }
      }

      if (auditUserId != null) {
        donor.updated_by = { id: auditUserId } as any;
      }
      await this.donorRepository.save(donor);

      const auditChanges = buildDonorFieldChanges(before, patchForAudit);
      if (auditChanges.length > 0) {
        await this.donorAuditService.log({
          donorId: id,
          action: DonorAuditAction.UPDATED,
          source: DonorAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
          metadata: {
            pipeline_reason: reason,
            transition_type: transitionType,
            amount: amountNum,
            currency,
          },
        });
      }
    } else if (
      amountNum != null &&
      Number.isFinite(amountNum) &&
      amountNum > 0 &&
      (toStage === DonorPipelineStage.ASK ||
        toStage === DonorPipelineStage.PLEDGE)
    ) {
      // noted transition can still update amount for ask/pledge
      donor.pipeline_amount_currency = currency;
      if (toStage === DonorPipelineStage.ASK) {
        donor.pipeline_ask_amount = amountNum as any;
      }
      if (toStage === DonorPipelineStage.PLEDGE) {
        donor.pipeline_pledge_amount = amountNum as any;
      }
      if (auditUserId != null) {
        donor.updated_by = { id: auditUserId } as any;
      }
      await this.donorRepository.save(donor);
    }

    const history = await this.pipelineHistoryRepository.save(
      this.pipelineHistoryRepository.create({
        donor_id: id,
        from_stage: fromStage,
        to_stage: toStage,
        reason,
        transition_type: transitionType,
        amount:
          amountNum != null && Number.isFinite(amountNum) && amountNum > 0
            ? (amountNum as any)
            : null,
        currency:
          amountNum != null && Number.isFinite(amountNum) && amountNum > 0
            ? currency
            : null,
        changed_by_id: auditUserId,
      }),
    );

    const refreshed = await this.findOne(id);
    return {
      donor: refreshed,
      history_entry: history,
    };
  }

  /**
   * Aggregate completed donations for donor profile / stats cards.
   */
  async buildDonorDonationStats(donorId: number): Promise<DonorDonationStats> {
    const completedQb = () =>
      this.donationRepository
        .createQueryBuilder("donation")
        .where("donation.donor_id = :donorId", { donorId })
        .andWhere("LOWER(donation.status) = :status", { status: "completed" });

    const aggregates = await completedQb()
      .select("COUNT(donation.id)", "total_donations")
      .addSelect(
        "COALESCE(SUM(COALESCE(donation.paid_amount, donation.amount, 0)), 0)",
        "total_donated",
      )
      .getRawOne<{ total_donations: string; total_donated: string }>();

    const first = await completedQb()
      .orderBy("donation.date", "ASC")
      .addOrderBy("donation.created_at", "ASC")
      .limit(1)
      .getOne();

    const last = await completedQb()
      .orderBy("donation.date", "DESC")
      .addOrderBy("donation.created_at", "DESC")
      .limit(1)
      .getOne();

    const currency =
      last?.currency || first?.currency || "PKR";

    const toDonationRef = (row: Donation | null) => {
      if (!row) return null;
      return {
        date: row.date || row.created_at,
        amount: Number(row.paid_amount ?? row.amount ?? 0),
        currency: row.currency || currency,
      };
    };

    return {
      total_donations: Number(aggregates?.total_donations || 0),
      total_donated: Number(aggregates?.total_donated || 0),
      currency,
      first_donation: toDonationRef(first),
      last_donation: toDonationRef(last),
    };
  }

  /**
   * Recompute donor denormalized donation fields from completed donations.
   */
  async recalculateDonorDonationStats(donorId: number): Promise<DonorDonationStats> {
    const stats = await this.buildDonorDonationStats(donorId);
    const donor = await this.donorRepository.findOne({
      where: { id: donorId, is_archived: false },
    });
    if (donor) {
      donor.donation_count = stats.total_donations;
      donor.total_donated = stats.total_donated;
      if (stats.last_donation?.date) {
        donor.last_donation_date = new Date(stats.last_donation.date);
      } else {
        donor.last_donation_date = null;
      }
      await this.donorRepository.save(donor);
    }
    return stats;
  }

  private async applyDonorDonationStatsIfStale(
    donor: Donor,
    stats: DonorDonationStats,
  ): Promise<void> {
    const currentCount = Number(donor.donation_count || 0);
    const currentTotal = Number(donor.total_donated || 0);
    if (
      currentCount === stats.total_donations &&
      currentTotal === stats.total_donated
    ) {
      return;
    }

    donor.donation_count = stats.total_donations;
    donor.total_donated = stats.total_donated;
    if (stats.last_donation?.date) {
      donor.last_donation_date = new Date(stats.last_donation.date);
    }
    await this.donorRepository.save(donor);
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
  async update(
    id: number,
    updateDonorDto: UpdateDonorDto,
    user?: any,
  ): Promise<Donor> {
    try {
      const donor = await this.donorRepository.findOne({
        where: { id, is_archived: false },
        relations: ["assigned_to", "referred_by"],
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      const auditUserId = this.donorAuditUserId(user?.id);
      const before = this.donorAuditSnapshot(donor);
      const dto = { ...updateDonorDto } as Record<string, unknown>;

      // Pipeline stage changes must go through changePipelineStage (reason required)
      delete dto.pipeline_stage;
      delete dto.pipeline_stage_changed_at;
      delete dto.pipeline_stage_changed_by_id;
      delete dto.effective_pipeline_stage;
      delete dto.pipeline_ask_amount;
      delete dto.pipeline_pledge_amount;
      delete dto.pipeline_amount_currency;

      const organizationId =
        dto.organization_id !== undefined ? dto.organization_id : undefined;
      const organizationBranchId = dto.organization_branch_id;
      const affiliationRole = dto.affiliation_role;
      const affiliationIsPrimary = dto.affiliation_is_primary;
      delete dto.organization_id;
      delete dto.organization_branch_id;
      delete dto.affiliation_role;
      delete dto.affiliation_is_primary;
      delete dto.organization_affiliations;

      const patch = this.buildDonorPatch(dto as UpdateDonorDto);

      if (dto.assigned_to_user_id !== undefined) {
        const assignedId =
          dto.assigned_to_user_id === null || dto.assigned_to_user_id === ""
            ? null
            : Number(dto.assigned_to_user_id);
        if (assignedId) {
          const assignedUser = await this.usersService.findOne(assignedId);
          if (!assignedUser) {
            throw new NotFoundException("Assigned to user not found");
          }
          donor.assigned_to = assignedUser as any;
        } else {
          donor.assigned_to = null;
        }
        patch.assigned_to_user_id = assignedId;
      }

      if (dto.referrer_user_id !== undefined) {
        const referrerId =
          dto.referrer_user_id === null || dto.referrer_user_id === ""
            ? null
            : Number(dto.referrer_user_id);
        if (referrerId) {
          const referrer = await this.userRepository.findOne({
            where: { id: referrerId },
          });
          if (!referrer) {
            throw new NotFoundException("Referrer user not found");
          }
          donor.referred_by = referrer as any;
        } else {
          donor.referred_by = null;
        }
        patch.referrer_user_id = referrerId;
      }

      if (auditUserId != null) {
        donor.updated_by = { id: auditUserId } as any;
      }

      const auditChanges = buildDonorFieldChanges(before, patch);
      const { assigned_to_user_id: _a, referrer_user_id: _r, ...scalarPatch } =
        patch;
      Object.assign(donor, scalarPatch);
      this.applyGeoSearchToDonor(donor);
      let updatedDonor = await this.donorRepository.save(donor);

      // Optional org link on update (additive). Does not clear affiliations when omitted.
      if (organizationId != null && organizationId !== "") {
        updatedDonor = await this.linkDonorToOrganization(updatedDonor, {
          organization_id: Number(organizationId),
          organization_branch_id:
            organizationBranchId != null && organizationBranchId !== ""
              ? Number(organizationBranchId)
              : null,
          affiliation_role: affiliationRole as OrganizationAffiliationRole,
          affiliation_is_primary:
            affiliationIsPrimary === undefined
              ? true
              : !!affiliationIsPrimary,
        });
      }

      if (auditChanges.length > 0) {
        await this.donorAuditService.log({
          donorId: id,
          action: DonorAuditAction.UPDATED,
          source: DonorAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      delete updatedDonor.password;
      delete (updatedDonor as any).password_enc;

      return updatedDonor;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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
        relations: ["assigned_to", "referred_by"],
      });

      if (!donor) {
        throw new NotFoundException(`Donor with ID ${id} not found`);
      }

      const auditUserId = this.donorAuditUserId(user?.id);
      const before = this.donorAuditSnapshot(donor);
      const archivePatch = {
        is_active: false,
        is_archived: true,
      };
      const auditChanges = buildDonorFieldChanges(before, archivePatch);

      donor.is_active = false;
      donor.is_archived = true;
      if (auditUserId != null) {
        donor.updated_by = { id: auditUserId } as any;
      }

      if (auditChanges.length > 0) {
        await this.donorAuditService.log({
          donorId: id,
          action: DonorAuditAction.ARCHIVED,
          source: DonorAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

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
   * Update donor last donation date when a non-anonymous donation is recorded.
   */
  async updateLastDonationDate(
    donorId: number,
    donationDate?: Date | string | null,
  ): Promise<void> {
    if (!donorId || Number(donorId) <= 0) {
      return;
    }

    try {
      const donor = await this.donorRepository.findOne({
        where: { id: donorId, is_archived: false },
      });
      if (!donor) {
        return;
      }

      const at = donationDate ? new Date(donationDate) : new Date();
      if (Number.isNaN(at.getTime())) {
        return;
      }

      const existing = donor.last_donation_date
        ? new Date(donor.last_donation_date)
        : null;
      if (
        existing &&
        !Number.isNaN(existing.getTime()) &&
        existing.getTime() >= at.getTime()
      ) {
        return;
      }

      donor.last_donation_date = at;
      await this.donorRepository.save(donor);
    } catch (error) {
      console.error("Failed to update donor last donation date:", error);
    }
  }

  /**
   * Update donation statistics (recomputed from completed donations).
   */
  async updateDonationStats(donorId: number, _amount?: number): Promise<void> {
    try {
      await this.recalculateDonorDonationStats(donorId);
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
