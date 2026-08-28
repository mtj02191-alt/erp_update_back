import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, ILike, SelectQueryBuilder } from "typeorm";
import { DonationBox } from "./entities/donation-box.entity";
import { CreateDonationBoxDto } from "./dto/create-donation-box.dto";
import { UpdateDonationBoxDto } from "./dto/update-donation-box.dto";
import {
  applyCommonFilters,
  FilterPayload,
} from "../../utils/filters/common-filter.util";
import { Route } from "../geographic/routes/entities/route.entity";
import { City } from "../geographic/cities/entities/city.entity";
import { Region } from "../geographic/regions/entities/region.entity";
import { User } from "../../users/user.entity";
import { DonationBoxAuditService } from "./audit/donation-box-audit.service";
import { DonationBoxAuditAction } from "./audit/donation-box-audit-action.enum";
import { DonationBoxAuditSource } from "./audit/donation-box-audit-source.enum";
import { buildDonationBoxFieldChanges } from "./audit/donation-box-audit.util";
import { DataScopeService } from "../../permissions/data-scope/data-scope.service";
import { ResolvedDataScope } from "../../permissions/data-scope/data-scope.types";
import { GeographicScopeService } from "../../permissions/geographic-scope/geographic-scope.service";
import { ResolvedGeographicScope } from "../../permissions/geographic-scope/geographic-scope.types";
import { DonationBoxGeoRecord } from "../../permissions/geographic-scope/geographic-scope.types";
import { buildDonationBoxGeoSearch } from "./utils/donation-box-geo.util";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  region?: string;
  city?: string;
  region_id?: string | number;
  city_id?: string | number;
  route_id?: string | number;
  assigned_user_id?: string | number;
  box_type?: string;
  status?: string;
  frequency?: string;
  is_active?: boolean;
  date?: string;
  start_date?: string;
  end_date?: string;
  team_filter?: string;
  team_filter_user_id?: string | number;
}

const DONATION_BOX_SORT_FIELDS = new Set([
  "created_at",
  "updated_at",
  "active_since",
  "shop_name",
  "box_id_no",
  "key_no",
  "status",
  "box_type",
  "frequency",
  "total_collected",
  "last_collection_date",
]);

@Injectable()
export class DonationBoxService {
  constructor(
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly donationBoxAuditService: DonationBoxAuditService,
    private readonly dataScopeService: DataScopeService,
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  async resolveDonationBoxScope(currentUser?: {
    id?: number;
    role?: string;
    department?: string;
  }): Promise<ResolvedDataScope> {
    return this.dataScopeService.resolveScope(
      currentUser?.id,
      currentUser?.role,
      currentUser?.department,
      "fund_raising",
      "donation_box",
    );
  }

  assertDonationBoxRecordAccess(
    scope: ResolvedDataScope,
    record: DonationBox,
  ): void {
    this.dataScopeService.assertRecordAccess(scope, record);
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
   * When geographic territory filter is active, geo match governs access.
   * Otherwise fall back to data scope (created_by).
   */
  assertDonationBoxViewAccess(
    dataScope: ResolvedDataScope,
    box: DonationBox,
    geoScope?: ResolvedGeographicScope | null,
  ): void {
    if (
      geoScope &&
      this.geographicScopeService.isGeographicFilterActive(geoScope)
    ) {
      if (
        !this.geographicScopeService.recordMatches(
          geoScope,
          "donation_boxes",
          this.toDonationBoxGeoRecord(box),
        )
      ) {
        throw new ForbiddenException(
          "You do not have geographic access to this record",
        );
      }
      return;
    }

    this.assertDonationBoxRecordAccess(dataScope, box);
  }

  private applyDonationBoxListDataScope(
    query: SelectQueryBuilder<DonationBox>,
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
    this.dataScopeService.applyToQuery(query, "donation_box", dataScope);
  }

  private async resolveCityName(cityId?: number | null): Promise<string | null> {
    if (!cityId) return null;
    const city = await this.cityRepository.findOne({
      where: { id: cityId },
      select: ["id", "name"],
    });
    return city?.name ?? null;
  }

  private async refreshDonationBoxGeoSearch(boxId: number): Promise<void> {
    const box = await this.donationBoxRepository.findOne({
      where: { id: boxId },
      relations: ["route", "route.region", "route.country"],
    });
    if (!box) return;

    const cityName = await this.resolveCityName(box.city_id);
    const geo_search = buildDonationBoxGeoSearch({
      landmark_marketplace: box.landmark_marketplace,
      shop_name: box.shop_name,
      route: box.route,
      city_name: cityName,
    });

    await this.donationBoxRepository.update(boxId, { geo_search });
  }

  private donationBoxAuditUserId(
    userId: number | null | undefined,
  ): number | null {
    if (userId == null || Number(userId) === -1) return null;
    return Number(userId);
  }

  private donationBoxAuditSnapshot(box: DonationBox): Record<string, unknown> {
    return {
      key_no: box.key_no,
      route_id: box.route_id,
      city_id: box.city_id,
      shop_name: box.shop_name,
      shopkeeper: box.shopkeeper,
      cell_no: box.cell_no,
      landmark_marketplace: box.landmark_marketplace,
      box_type: box.box_type,
      status: box.status,
      frequency: box.frequency,
      active_since: box.active_since,
      last_collection_date: box.last_collection_date,
      total_collected: box.total_collected,
      collection_count: box.collection_count,
      notes: box.notes,
      is_active: box.is_active,
      is_archived: box.is_archived,
      assigned_user_ids: (box.assignedUsers || [])
        .map((u) => u.id)
        .sort((a, b) => a - b),
    };
  }

  private buildDonationBoxPatch(dto: Record<string, unknown>): Record<string, unknown> {
    const allowed = [
      "key_no",
      "box_id_no",
      "route_id",
      "city_id",
      "shop_name",
      "shopkeeper",
      "cell_no",
      "landmark_marketplace",
      "box_type",
      "status",
      "frequency",
      "active_since",
      "last_collection_date",
      "notes",
      "is_active",
      "is_archived",
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (dto[key] === undefined) continue;
      if (key === "key_no" || key === "box_id_no") {
        patch[key] = this.normalizeOptionalText(dto[key]);
      } else if (key === "route_id" || key === "city_id") {
        const raw = dto[key];
        if (raw === "" || raw === null) patch[key] = null;
        else {
          const n = Number(raw);
          patch[key] = Number.isFinite(n) ? n : null;
        }
      } else {
        patch[key] = dto[key];
      }
    }
    return patch;
  }

  async getDonationBoxAuditHistory(donationBoxId: number) {
    return this.donationBoxAuditService.findByDonationBoxId(donationBoxId);
  }

  /**
   * Create a new donation box
   */
  async create(
    createDonationBoxDto: CreateDonationBoxDto,
    currentUser: any,
  ): Promise<DonationBox> {
    try {
      let route: Route | null = null;
      if (createDonationBoxDto.route_id != null) {
        route = await this.routeRepository.findOne({
          where: { id: createDonationBoxDto.route_id },
          relations: ["region", "country"],
        });

        if (!route) {
          throw new NotFoundException(
            `Route with ID ${createDonationBoxDto.route_id} not found`,
          );
        }
      }

      // Validate assigned users if provided
      let assignedUsers: User[] = [];
      if (
        createDonationBoxDto.assigned_user_ids &&
        createDonationBoxDto.assigned_user_ids.length > 0
      ) {
        assignedUsers = await this.userRepository.findBy({
          id: In(createDonationBoxDto.assigned_user_ids),
        });

        if (
          assignedUsers.length !== createDonationBoxDto.assigned_user_ids.length
        ) {
          const foundIds = assignedUsers.map((user) => user.id);
          const missingIds = createDonationBoxDto.assigned_user_ids.filter(
            (id) => !foundIds.includes(id),
          );
          throw new NotFoundException(
            `Users with IDs ${missingIds.join(", ")} not found`,
          );
        }
      }

      // Create donation box entity
      const { assigned_user_ids, ...boxData } = createDonationBoxDto;
      const auditUserId = this.donationBoxAuditUserId(currentUser?.id);
      const normalizedBoxIdNo = this.normalizeOptionalText(boxData.box_id_no);
      const normalizedKeyNo = this.normalizeOptionalText(boxData.key_no);
      const donationBox = this.donationBoxRepository.create({
        ...boxData,
        box_id_no: normalizedBoxIdNo,
        key_no: normalizedKeyNo,
        route_id: boxData.route_id ?? null,
        city_id: boxData.city_id ?? null,
        ...(auditUserId != null
          ? { created_by: { id: auditUserId } as any }
          : {}),
        assignedUsers: assignedUsers,
        geo_search: buildDonationBoxGeoSearch({
          landmark_marketplace: boxData.landmark_marketplace,
          shop_name: boxData.shop_name,
          route,
          city_name: await this.resolveCityName(boxData.city_id),
        }),
      });

      // Save and return
      const savedBox = await this.donationBoxRepository.save(donationBox);

      return savedBox;
    } catch (error) {
      console.error("Error creating donation box:", error);
      throw new Error(`Failed to create donation box: ${error.message}`);
    }
  }

  /**
   * Resolve region + city + route for CSV import.
   * Finds existing entities by name; creates the route under the city if missing.
   */
  async resolveGeoForImport(params: {
    route_id?: number;
    route_name?: string;
    city_id?: number;
    city_name?: string;
    region_id?: number;
    region_name?: string;
  }): Promise<{ route_id: number | null; city_id: number; region_id?: number }> {
    let regionId = params.region_id;
    if (!regionId && params.region_name?.trim()) {
      const regions = await this.regionRepository.find({
        where: { name: ILike(params.region_name.trim()) },
      });
      if (regions.length === 0) {
        throw new NotFoundException(
          `Region "${params.region_name}" not found`,
        );
      }
      if (regions.length > 1) {
        throw new NotFoundException(
          `Multiple regions match "${params.region_name}" — use region_id`,
        );
      }
      regionId = regions[0].id;
    }

    let city: City | null = null;
    if (params.city_id) {
      city = await this.cityRepository.findOne({
        where: { id: params.city_id },
        relations: ["region", "country"],
      });
      if (!city) {
        throw new NotFoundException(`City with ID ${params.city_id} not found`);
      }
    } else if (params.city_name?.trim()) {
      const cityQb = this.cityRepository
        .createQueryBuilder("city")
        .leftJoinAndSelect("city.region", "region")
        .leftJoinAndSelect("city.country", "country")
        .where("LOWER(city.name) = LOWER(:name)", {
          name: params.city_name.trim(),
        });
      if (regionId) {
        cityQb.andWhere("city.region_id = :regionId", { regionId });
      }
      const cities = await cityQb.getMany();
      if (cities.length === 0) {
        throw new NotFoundException(
          `City "${params.city_name}" not found${
            regionId ? ` in region_id ${regionId}` : ""
          }`,
        );
      }
      if (cities.length > 1) {
        throw new NotFoundException(
          `Multiple cities match "${params.city_name}" — provide Region`,
        );
      }
      city = cities[0];
    }

    if (!city) {
      throw new NotFoundException("city_id or City is required for import");
    }

    if (!regionId && city.region_id) {
      regionId = city.region_id;
    }

    if (params.route_id) {
      const route = await this.routeRepository.findOne({
        where: { id: params.route_id },
        relations: ["cities"],
      });
      if (!route) {
        throw new NotFoundException(
          `Route with ID ${params.route_id} not found`,
        );
      }
      return { route_id: route.id, city_id: city.id, region_id: regionId };
    }

    const routeName = params.route_name?.trim();
    if (!routeName) {
      return { route_id: null, city_id: city.id, region_id: regionId };
    }

    const existingRoutes = await this.routeRepository
      .createQueryBuilder("route")
      .innerJoin("route.cities", "city")
      .where("LOWER(route.name) = LOWER(:name)", { name: routeName })
      .andWhere("city.id = :cityId", { cityId: city.id })
      .getMany();

    if (existingRoutes.length > 1) {
      throw new NotFoundException(
        `Multiple routes named "${routeName}" for city "${city.name}"`,
      );
    }

    if (existingRoutes.length === 1) {
      return {
        route_id: existingRoutes[0].id,
        city_id: city.id,
        region_id: regionId,
      };
    }

    // Create route for this city when missing
    const createRegionId = city.region_id ?? regionId;
    if (!createRegionId || !city.country_id) {
      throw new NotFoundException(
        `City "${city.name}" is missing region/country — cannot create route "${routeName}"`,
      );
    }
    const newRoute = this.routeRepository.create({
      name: routeName,
      region_id: createRegionId,
      country_id: city.country_id,
      cities: [city],
    });
    const savedRoute = await this.routeRepository.save(newRoute);

    return {
      route_id: savedRoute.id,
      city_id: city.id,
      region_id: regionId,
    };
  }

  /**
   * Resolve FRD officer reference (person name) → user id(s) for assignment.
   * Matches full name, first name, or first+last with light fuzzy tolerance.
   */
  private async resolveUserIdsByOfficerName(
    name: string | undefined,
  ): Promise<number[]> {
    const query = String(name || "").trim();
    if (!query) return [];

    const candidates = await this.userRepository.find({
      where: { is_archived: false, isActive: true },
      take: 500,
    });

    const normalize = (v: string) =>
      String(v || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const q = normalize(query);
    let best: User | null = null;
    let bestScore = 0;

    for (const user of candidates) {
      const first = normalize(user.first_name || "");
      const last = normalize(user.last_name || "");
      const full = normalize([user.first_name, user.last_name].filter(Boolean).join(" "));
      let score = 0;
      if (full && full === q) score = 100;
      else if (first && first === q) score = 90;
      else if (full && full.includes(q)) score = 80;
      else if (q.includes(full) && full) score = 75;
      else if (first && q.includes(first) && first.length >= 3) score = 65;
      if (score > bestScore) {
        bestScore = score;
        best = user;
      }
    }

    if (best && bestScore >= 65) return [best.id];
    throw new NotFoundException(
      `FRD officer "${query}" not found among active users — check spelling or assign manually`,
    );
  }

  async importDonationBoxRow(
    row: Record<string, unknown>,
    user: any,
  ): Promise<{ box: DonationBox; skipped: boolean; skip_reason?: string }> {
    const resolved = await this.resolveGeoForImport({
      route_id: row.route_id as number | undefined,
      route_name: row.route_name as string | undefined,
      city_id: row.city_id as number | undefined,
      city_name: row.city_name as string | undefined,
      region_id: row.region_id as number | undefined,
      region_name: row.region_name as string | undefined,
    });

    let assignedUserIds = Array.isArray(row.assigned_user_ids)
      ? (row.assigned_user_ids as number[])
      : [];

    // FRD Officer Reference is a name lookup only → assignedUsers (not stored)
    const frdRef = String(row.frd_officer_reference || "").trim();
    if (assignedUserIds.length === 0 && frdRef) {
      assignedUserIds = await this.resolveUserIdsByOfficerName(frdRef);
    }

    const hasGps =
      row.registration_latitude != null && row.registration_longitude != null;

    const existing = await this.findExistingDonationBoxForImport({
      box_id_no: row.box_id_no as string | undefined,
      key_no: row.key_no as string | undefined,
      shop_name: String(row.shop_name || ""),
      shopkeeper: row.shopkeeper as string | undefined,
      cell_no: row.cell_no as string | undefined,
      city_id: resolved.city_id,
    });
    if (existing) {
      return { box: existing.box, skipped: true, skip_reason: existing.reason };
    }

    const createDto = {
      box_id_no: this.normalizeOptionalText(row.box_id_no as string | undefined),
      key_no: this.normalizeOptionalText(row.key_no as string | undefined),
      route_id: resolved.route_id ?? null,
      city_id: resolved.city_id,
      shop_name: String(row.shop_name || "").trim(),
      shopkeeper: row.shopkeeper as string | undefined,
      cell_no: row.cell_no as string | undefined,
      address: (row.address as string | undefined) || undefined,
      landmark_marketplace: row.landmark_marketplace as string | undefined,
      box_type: row.box_type,
      status: row.status,
      frequency: row.frequency,
      active_since: row.active_since,
      notes: row.notes as string | undefined,
      assigned_user_ids: assignedUserIds,
      registration_latitude: row.registration_latitude as number | undefined,
      registration_longitude: row.registration_longitude as number | undefined,
      registration_location_name:
        (row.registration_location_name as string | undefined) || undefined,
      require_collection_location:
        row.require_collection_location === true || hasGps,
    } as CreateDonationBoxDto;

    const box = await this.create(createDto, user);
    return { box, skipped: false };
  }

  /** Blank / whitespace → null so unique(box_id_no) and optional key_no stay clean. */
  private normalizeOptionalText(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s || null;
  }

  /** Resolve city/route for import rows (used by handler for in-file dedupe). */
  async resolveGeoForImportRow(
    row: Record<string, unknown>,
  ): Promise<{ route_id: number | null; city_id: number; region_id?: number }> {
    return this.resolveGeoForImport({
      route_id: row.route_id as number | undefined,
      route_name: row.route_name as string | undefined,
      city_id: row.city_id as number | undefined,
      city_name: row.city_name as string | undefined,
      region_id: row.region_id as number | undefined,
      region_name: row.region_name as string | undefined,
    });
  }

  /** Check if import row already maps to an existing box. */
  async findExistingDonationBoxForImportRow(
    row: Record<string, unknown>,
  ): Promise<{ box: DonationBox; reason: string } | null> {
    const resolved = await this.resolveGeoForImportRow(row);
    return this.findExistingDonationBoxForImport({
      box_id_no: row.box_id_no as string | undefined,
      key_no: row.key_no as string | undefined,
      shop_name: String(row.shop_name || ""),
      shopkeeper: row.shopkeeper as string | undefined,
      cell_no: row.cell_no as string | undefined,
      city_id: resolved.city_id,
    });
  }

  /**
   * Identity for import skip:
   * 1) box_id_no when present
   * 2) shop_name + shopkeeper + cell_no (same shop name alone is NOT a duplicate)
   */
  private async findExistingDonationBoxForImport(params: {
    box_id_no?: string | null;
    key_no?: string | null;
    shop_name?: string | null;
    shopkeeper?: string | null;
    cell_no?: string | null;
    city_id?: number | null;
  }): Promise<{ box: DonationBox; reason: string } | null> {
    const boxIdNo = String(params.box_id_no || "")
      .trim()
      .toLowerCase();
    const shopName = this.normalizeName(params.shop_name);
    const shopkeeper = this.normalizeName(params.shopkeeper);
    const phone = this.normalizePhone(params.cell_no);

    const baseQb = () =>
      this.donationBoxRepository
        .createQueryBuilder("b")
        .where("b.is_archived = false");

    if (boxIdNo) {
      const byBoxId = await baseQb()
        .andWhere("LOWER(TRIM(b.box_id_no)) = :boxIdNo", { boxIdNo })
        .orderBy("b.id", "ASC")
        .getOne();
      if (byBoxId) {
        return {
          box: byBoxId,
          reason: `Already in DB (matched box_id_no="${params.box_id_no}" → id ${byBoxId.id})`,
        };
      }
    }

    // Same shop name alone is allowed; require shop + shopkeeper + phone combo.
    if (shopName) {
      const candidates = await baseQb()
        .andWhere("LOWER(TRIM(b.shop_name)) = :shopName", { shopName })
        .orderBy("b.id", "ASC")
        .getMany();

      for (const box of candidates) {
        const boxKeeper = this.normalizeName(box.shopkeeper);
        const boxPhone = this.normalizePhone(box.cell_no);
        if (boxKeeper === shopkeeper && boxPhone === phone) {
          return {
            box,
            reason: `Already in DB (matched shop="${params.shop_name}" + shopkeeper="${params.shopkeeper || ""}" + phone="${params.cell_no || ""}" → id ${box.id})`,
          };
        }
      }
    }

    return null;
  }

  private normalizeName(value: unknown): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  /** Digits-only phone so 0301-6464990 matches 03016464990. */
  private normalizePhone(value: unknown): string {
    return String(value || "").replace(/\D/g, "");
  }

  private applyDonationBoxActiveSinceDateFilter(
    query: SelectQueryBuilder<DonationBox>,
    filters: {
      date?: string;
      start_date?: string;
      end_date?: string;
    },
  ): void {
    const dateField = "donation_box.active_since";
    if (filters.start_date && filters.end_date) {
      query.andWhere(`${dateField} BETWEEN :dbStartDate AND :dbEndDate`, {
        dbStartDate: filters.start_date,
        dbEndDate: filters.end_date,
      });
    } else if (filters.start_date) {
      query.andWhere(`${dateField} >= :dbStartDate`, {
        dbStartDate: filters.start_date,
      });
    } else if (filters.end_date) {
      query.andWhere(`${dateField} <= :dbEndDate`, {
        dbEndDate: filters.end_date,
      });
    } else if (filters.date) {
      query.andWhere(`${dateField} = :dbExactDate`, {
        dbExactDate: filters.date,
      });
    }
  }

  /**
   * Find all donation boxes with pagination and filtering
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
        sortField = "created_at",
        sortOrder = "DESC",
        search = "",
        region = "",
        city = "",
        region_id = "",
        city_id = "",
        route_id = "",
        assigned_user_id = "",
        box_type = "",
        status = "",
        frequency = "",
        is_active,
        date = "",
        start_date,
        end_date,
        team_filter,
        team_filter_user_id,
      } = options;

      const skip = (page - 1) * pageSize;

      // Define searchable fields (only string fields that can be used with LOWER())
      const searchFields = [
        "box_id_no",
        "key_no",
        "shop_name",
        "shopkeeper",
        "cell_no",
        "address",
        "landmark_marketplace",
        "route.name", // Search in route name from joined table
      ];

      // Build query with filters and relations
      const query = this.donationBoxRepository
        .createQueryBuilder("donation_box")
        .leftJoinAndSelect("donation_box.route", "route")
        .leftJoinAndSelect("route.cities", "cities")
        .leftJoinAndSelect("route.region", "region")
        .leftJoinAndSelect("route.country", "country")
        .leftJoinAndSelect("donation_box.assignedUsers", "assignedUsers")
        .where("donation_box.is_archived = false");

      // Apply common filters (direct columns only — geo/date handled below)
      const filters: FilterPayload = {
        search,
        box_type,
        status,
        frequency,
      };

      if (is_active !== undefined) {
        filters.is_active = is_active;
      }

      applyCommonFilters(query, filters, searchFields, "donation_box");

      const regionId = Number(region_id);
      if (Number.isFinite(regionId) && regionId > 0) {
        query.andWhere("route.region_id = :filterRegionId", {
          filterRegionId: regionId,
        });
      } else if (region && String(region).trim()) {
        query.andWhere("LOWER(region.name) = LOWER(:filterRegionName)", {
          filterRegionName: String(region).trim(),
        });
      }

      const cityId = Number(city_id);
      if (Number.isFinite(cityId) && cityId > 0) {
        query.andWhere("donation_box.city_id = :filterCityId", {
          filterCityId: cityId,
        });
      } else if (city && String(city).trim()) {
        query.andWhere(
          `(LOWER(cities.name) = LOWER(:filterCityName) OR donation_box.city_id IN (
            SELECT c.id FROM cities c WHERE LOWER(c.name) = LOWER(:filterCityName)
          ))`,
          { filterCityName: String(city).trim() },
        );
      }

      const routeId = Number(route_id);
      if (Number.isFinite(routeId) && routeId > 0) {
        query.andWhere("donation_box.route_id = :filterRouteId", {
          filterRouteId: routeId,
        });
      }

      const assigneeId = Number(assigned_user_id);
      if (Number.isFinite(assigneeId) && assigneeId > 0) {
        query.andWhere(
          `EXISTS (
            SELECT 1 FROM donation_box_users dbu
            WHERE dbu.donation_box_id = donation_box.id
            AND dbu.user_id = :filterAssigneeId
          )`,
          { filterAssigneeId: assigneeId },
        );
      }

      this.applyDonationBoxActiveSinceDateFilter(query, {
        date,
        start_date,
        end_date,
      });

      if (geoScope) {
        this.geographicScopeService.applyToQuery(
          query,
          "donation_boxes",
          "donation_box",
          geoScope,
        );
      }

      if (currentUser?.id) {
        const scope = await this.dataScopeService.resolveListScope({
          userId: currentUser.id,
          userRole: currentUser.role,
          userDepartment: currentUser.department,
          permissionDepartment: "fund_raising",
          module: "donation_box",
          teamFilter: team_filter,
          teamFilterUserId: team_filter_user_id,
        });
        this.applyDonationBoxListDataScope(query, scope, geoScope);
      }

      // Apply sorting (whitelist to prevent SQL injection)
      const safeSortField = DONATION_BOX_SORT_FIELDS.has(sortField || "")
        ? sortField!
        : "created_at";
      query.orderBy(`donation_box.${safeSortField}`, sortOrder);

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
      console.error("Error retrieving donation boxes:", error);
      throw new Error(`Failed to retrieve donation boxes: ${error.message}`);
    }
  }

  /**
   * Find one donation box by ID
   */
  async findOne(id: number): Promise<DonationBox> {
    try {
      const donationBox = await this.donationBoxRepository.findOne({
        where: { id, is_archived: false },
        relations: [
          "route",
          "route.cities",
          "route.region",
          "route.country",
          "city",
          "city.region",
          "assignedUsers",
          "created_by",
          "updated_by",
        ],
      });

      if (!donationBox) {
        throw new NotFoundException(`Donation box with ID ${id} not found`);
      }

      return donationBox;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error("Error retrieving donation box:", error.message);
      throw new NotFoundException(
        `Failed to retrieve donation box: ${error.message}`,
      );
    }
  }

  /**
   * Update a donation box
   */
  async update(
    id: number,
    updateDonationBoxDto: any,
    currentUser?: any,
  ): Promise<DonationBox> {
    try {
      const donationBox = await this.donationBoxRepository.findOne({
        where: { id },
        relations: ["assignedUsers"],
      });

      if (!donationBox) {
        throw new NotFoundException(`Donation box with ID ${id} not found`);
      }

      const auditUserId = this.donationBoxAuditUserId(currentUser?.id);
      const before = this.donationBoxAuditSnapshot(donationBox);
      const dto = { ...updateDonationBoxDto } as Record<string, unknown>;
      const auditPatch: Record<string, unknown> = {
        ...this.buildDonationBoxPatch(dto),
      };

      if (updateDonationBoxDto.route_id != null) {
        const route = await this.routeRepository.findOne({
          where: { id: updateDonationBoxDto.route_id },
        });
        if (!route) {
          throw new NotFoundException(
            `Route with ID ${updateDonationBoxDto.route_id} not found`,
          );
        }
      }

      if (updateDonationBoxDto.assigned_user_ids !== undefined) {
        let assignedUsers: User[] = [];
        if (
          updateDonationBoxDto.assigned_user_ids &&
          updateDonationBoxDto.assigned_user_ids.length > 0
        ) {
          assignedUsers = await this.userRepository.findBy({
            id: In(updateDonationBoxDto.assigned_user_ids),
          });
          if (
            assignedUsers.length !==
            updateDonationBoxDto.assigned_user_ids.length
          ) {
            const foundIds = assignedUsers.map((user) => user.id);
            const missingIds = updateDonationBoxDto.assigned_user_ids.filter(
              (uid: number) => !foundIds.includes(uid),
            );
            throw new NotFoundException(
              `Users with IDs ${missingIds.join(", ")} not found`,
            );
          }
        }
        donationBox.assignedUsers = assignedUsers;
        auditPatch.assigned_user_ids = (assignedUsers || [])
          .map((u) => u.id)
          .sort((a, b) => a - b);
        await this.donationBoxRepository.save(donationBox);
      }

      const { assigned_user_ids: _au, ...updateData } = updateDonationBoxDto;
      const scalarPatch = this.buildDonationBoxPatch(
        updateData as Record<string, unknown>,
      );
      Object.assign(auditPatch, scalarPatch);

      if (auditUserId != null) {
        scalarPatch.updated_by = auditUserId;
      }

      const auditChanges = buildDonationBoxFieldChanges(before, auditPatch);
      if (Object.keys(scalarPatch).length > 0) {
        await this.donationBoxRepository.update(id, scalarPatch as any);
      }

      const geoFields = ["route_id", "city_id", "landmark_marketplace", "shop_name"];
      if (geoFields.some((field) => field in scalarPatch)) {
        await this.refreshDonationBoxGeoSearch(id);
      }

      if (auditChanges.length > 0) {
        const action = auditChanges.some((c) => c.field === "status")
          ? DonationBoxAuditAction.STATUS_CHANGED
          : DonationBoxAuditAction.UPDATED;
        await this.donationBoxAuditService.log({
          donationBoxId: id,
          action,
          source: DonationBoxAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      return await this.donationBoxRepository.findOne({
        where: { id },
        relations: [
          "route",
          "route.cities",
          "route.region",
          "route.country",
          "assignedUsers",
          "created_by",
          "updated_by",
        ],
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error("Error updating donation box:", error.message);
      throw new Error(`Failed to update donation box: ${error.message}`);
    }
  }

  /**
   * Soft delete a donation box (archive)
   */
  async remove(id: number, currentUser?: any) {
    try {
      const donationBox = await this.donationBoxRepository.findOne({
        where: { id },
        relations: ["assignedUsers"],
      });

      if (!donationBox) {
        throw new NotFoundException(`Donation box with ID ${id} not found`);
      }

      const auditUserId = this.donationBoxAuditUserId(currentUser?.id);
      const before = this.donationBoxAuditSnapshot(donationBox);
      const archivePatch: Record<string, unknown> = { is_archived: true };
      if (auditUserId != null) {
        archivePatch.updated_by = auditUserId;
      }

      const auditChanges = buildDonationBoxFieldChanges(before, archivePatch);
      if (auditChanges.length > 0) {
        await this.donationBoxAuditService.log({
          donationBoxId: id,
          action: DonationBoxAuditAction.ARCHIVED,
          source: DonationBoxAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      await this.donationBoxRepository.update(id, archivePatch as any);

      return { message: "Donation box archived successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error("Error archiving donation box:", error.message);
      throw new Error(`Failed to archive donation box: ${error.message}`);
    }
  }

  /**
   * Update collection statistics
   */
  async updateCollectionStats(id: number, amount: number) {
    try {
      const donationBox = await this.donationBoxRepository.findOne({
        where: { id },
      });

      if (!donationBox) {
        throw new NotFoundException(`Donation box with ID ${id} not found`);
      }

      // Update statistics
      donationBox.total_collected =
        Number(donationBox.total_collected) + Number(amount);
      donationBox.collection_count = donationBox.collection_count + 1;
      donationBox.last_collection_date = new Date();

      await this.donationBoxRepository.save(donationBox);

      return donationBox;
    } catch (error) {
      console.error("Error updating collection statistics:", error.message);
      throw new Error(
        `Failed to update collection statistics: ${error.message}`,
      );
    }
  }

  /**
   * Get active boxes by region
   */
  async findActiveByRegion(region: string): Promise<DonationBox[]> {
    try {
      return await this.donationBoxRepository.find({
        where: {
          route: {
            region: {
              name: region,
            },
          },
          is_active: true,
          is_archived: false,
        },
        order: { shop_name: "ASC" },
      });
    } catch (error) {
      console.error("Error retrieving active boxes:", error.message);
      throw new Error(`Failed to retrieve active boxes: ${error.message}`);
    }
  }

  // i want to get by key number
  async findByKeyNumber(key_number: string): Promise<DonationBox> {
    try {
      return await this.donationBoxRepository.findOne({
        where: { key_no: key_number, is_archived: false },
      });
    } catch (error) {
      console.error("Error retrieving donation box by key number:", error);
      throw new Error(
        `Failed to retrieve donation box by key number: ${error.message}`,
      );
    }
  }

  async getDonationBoxListForDropdown(
    options?: {
      activeOnly?: boolean;
      status?: string;
    },
    geoScope?: ResolvedGeographicScope | null,
  ) {
    const queryBuilder = this.donationBoxRepository
      .createQueryBuilder("box")
      .leftJoin("box.route", "route")
      .select([
        "box.id",
        "box.key_no",
        "box.shop_name",
        "box.status",
        "box.is_active",
        "route.id",
        "route.name",
      ])
      .where("box.is_archived = false");

    if (options?.activeOnly !== undefined) {
      queryBuilder.andWhere("box.is_active = :isActive", {
        isActive: options.activeOnly,
      });
    }

    if (options?.status) {
      queryBuilder.andWhere("box.status = :status", { status: options.status });
    }

    if (geoScope) {
      this.geographicScopeService.applyToQuery(
        queryBuilder,
        "donation_boxes",
        "box",
        geoScope,
      );
    }

    queryBuilder.orderBy("box.shop_name", "ASC");

    const boxes = await queryBuilder.getMany();

    return boxes.map((box) => ({
      id: box.id,
      key_no: box.key_no,
      shop_name: box.shop_name,
      status: box.status,
      is_active: box.is_active,
      route_id: box.route?.id || null,
      route_name: box.route?.name || null,
    }));
  }
}
