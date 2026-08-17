import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Brackets,
  Repository,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from "typeorm";
import { User, UserRole, Department } from "../../users/user.entity";
import { City } from "../../dms/geographic/cities/entities/city.entity";
import { Region } from "../../dms/geographic/regions/entities/region.entity";
import { District } from "../../dms/geographic/districts/entities/district.entity";
import { Country } from "../../dms/geographic/countries/entities/country.entity";
import { Route } from "../../dms/geographic/routes/entities/route.entity";
import { Tehsil } from "../../dms/geographic/tehsils/entities/tehsil.entity";
import { PermissionsService } from "../permissions.service";
import { GEOGRAPHIC_DMS_DEPARTMENT } from "./geographic-scope.profiles";
import {
  DonationBoxGeoRecord,
  DonationGeoRecord,
  DonorGeoRecord,
  GeographicEntityKey,
  GeographicScopeSummary,
  ResolvedGeographicScope,
} from "./geographic-scope.types";

@Injectable()
export class GeographicScopeService {
  private readonly logger = new Logger(GeographicScopeService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Tehsil)
    private readonly tehsilRepository: Repository<Tehsil>,
    private readonly permissionsService: PermissionsService,
  ) {}

  /** Public summary for request.user / debugging (no bypass SQL state). */
  toScopeSummary(scope: ResolvedGeographicScope): GeographicScopeSummary {
    if (scope.bypass) {
      return { bypass: true, reason: scope.reason };
    }
    return {
      bypass: false,
      cityIds: scope.cityIds,
      cityNames: scope.cityNames,
      countryNames: scope.countryNames,
      regionNames: scope.regionNames,
      districtNames: scope.districtNames,
      tehsilNames: scope.tehsilNames,
      routeIds: scope.routeIds,
      routeNames: scope.routeNames,
      searchTokens: scope.searchTokens,
    };
  }

  private normalizeText(value: string | null | undefined): string {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  private uniqueStrings(values: string[]): string[] {
    return Array.from(
      new Set(values.map((v) => this.normalizeText(v)).filter(Boolean)),
    );
  }

  /** Split multi-word place names into tokens (e.g. "mian channu" → "mian", "channu"). */
  private splitWordTokens(names: string[]): string[] {
    const words: string[] = [];
    for (const name of names) {
      for (const part of String(name).split(/[\s,/-]+/)) {
        const normalized = this.normalizeText(part);
        if (normalized.length >= 3) {
          words.push(normalized);
        }
      }
    }
    return words;
  }

  /** All normalized place names used for exact + fuzzy city/location matching. */
  private getAllExactGeoNames(scope: ResolvedGeographicScope): string[] {
    return this.uniqueStrings([
      ...scope.cityNames,
      ...scope.regionNames,
      ...scope.districtNames,
      ...scope.tehsilNames,
      ...scope.routeNames,
      ...scope.countryNames,
    ]);
  }

  private buildSearchTokens(
    cityNames: Set<string>,
    regionNames: Set<string>,
    districtNames: Set<string>,
    tehsilNames: Set<string>,
    routeNames: Set<string>,
  ): string[] {
    const base = this.uniqueStrings([
      ...Array.from(cityNames),
      ...Array.from(regionNames),
      ...Array.from(districtNames),
      ...Array.from(tehsilNames),
      ...Array.from(routeNames),
    ]);
    const words = this.splitWordTokens(base);
    return this.uniqueStrings([...base, ...words]).filter(
      (token) => token.length >= 3,
    );
  }

  /** Match city/location column: exact name OR substring contains any search token. */
  private appendCityGeoMatchConditions(
    qb: {
      orWhere: WhereExpressionBuilder["orWhere"];
    },
    alias: string,
    column: string,
    scope: ResolvedGeographicScope,
    paramKey: string,
    label: string,
  ): void {
    const exactNames = this.getAllExactGeoNames(scope);
    if (exactNames.length) {
      qb.orWhere(
        `LOWER(TRIM(${alias}.${column})) IN (:...${paramKey}_${label}_exact)`,
        { [`${paramKey}_${label}_exact`]: exactNames },
      );
    }
    this.appendContainsConditions(
      qb,
      alias,
      column,
      scope.searchTokens,
      paramKey,
      `${label}_tok`,
    );
  }

  private hasAssignments(user: User): boolean {
    return (
      (user.assigned_countries?.length ?? 0) > 0 ||
      (user.assigned_regions?.length ?? 0) > 0 ||
      (user.assigned_districts?.length ?? 0) > 0 ||
      (user.assigned_tehsils?.length ?? 0) > 0 ||
      (user.assigned_cities?.length ?? 0) > 0 ||
      (user.assigned_routes?.length ?? 0) > 0
    );
  }

  /** True when geographic row filtering should run (assignments resolved to vocabulary). */
  isGeographicFilterActive(scope: ResolvedGeographicScope): boolean {
    if (scope.bypass) return false;
    return !this.isScopeEmpty(scope);
  }

  private isScopeEmpty(scope: ResolvedGeographicScope): boolean {
    return (
      !scope.cityIds.length &&
      !scope.cityNames.length &&
      !scope.countryNames.length &&
      !scope.regionNames.length &&
      !scope.districtNames.length &&
      !scope.tehsilNames.length &&
      !scope.routeIds.length &&
      !scope.routeNames.length &&
      !scope.searchTokens.length
    );
  }

  /**
   * Resolve a fund_raising user's geographic assignments into filter vocabulary.
   * Returns bypass=true when geographic filtering must not be applied.
   */
  async resolveForUser(
    userId: number | null | undefined,
    userRole?: string,
    userSnapshot?: Partial<User> | null,
  ): Promise<ResolvedGeographicScope> {
    const numericUserId = Number(userId);
    const emptyBypass = (
      reason: ResolvedGeographicScope["reason"],
    ): ResolvedGeographicScope => ({
      bypass: true,
      reason,
      userId: numericUserId || -1,
      cityIds: [],
      cityNames: [],
      countryNames: [],
      regionNames: [],
      districtNames: [],
      tehsilNames: [],
      routeIds: [],
      routeNames: [],
      searchTokens: [],
    });

    if (!numericUserId || numericUserId === -1) {
      return emptyBypass("not_applicable");
    }

    const user =
      userSnapshot?.department !== undefined && userSnapshot?.department !== null
        ? ({ id: numericUserId, ...userSnapshot } as User)
        : await this.userRepository.findOne({
            where: { id: numericUserId },
          });
    if (!user) {
      return emptyBypass("not_applicable");
    }

    if (user.department !== Department.FUND_RAISING) {
      return emptyBypass("not_applicable");
    }

    if (user.geographic_off === true) {
      return emptyBypass("geographic_off");
    }

    const permissions =
      await this.permissionsService.getUserPermissions(numericUserId);
    if (
      userRole === UserRole.SUPER_ADMIN ||
      permissions?.super_admin === true
    ) {
      return emptyBypass("super_admin");
    }

    if (!this.hasAssignments(user)) {
      return emptyBypass("no_assignments");
    }

    const assignedCountries = user.assigned_countries || [];
    const assignedRegions = user.assigned_regions || [];
    const assignedDistricts = user.assigned_districts || [];
    const assignedTehsils = user.assigned_tehsils || [];
    const assignedCities = user.assigned_cities || [];
    const assignedRoutes = user.assigned_routes || [];

    const cityIds = new Set<number>();
    const cityNames = new Set<string>();
    const regionNames = new Set<string>();
    const districtNames = new Set<string>();
    const tehsilNames = new Set<string>();
    const countryNames = new Set<string>();
    const routeIds = new Set<number>();
    const routeNames = new Set<string>();

    if (assignedCities.length) {
      const cities = await this.cityRepository
        .createQueryBuilder("city")
        .select(["city.id", "city.name"])
        .where("city.id IN (:...ids)", { ids: assignedCities })
        .andWhere("city.is_active = true")
        .getMany();
      cities.forEach((c) => {
        cityIds.add(c.id);
        cityNames.add(this.normalizeText(c.name));
      });
    }

    if (assignedRoutes.length) {
      const routes = await this.routeRepository
        .createQueryBuilder("route")
        .select(["route.id", "route.name"])
        .where("route.id IN (:...ids)", { ids: assignedRoutes })
        .andWhere("route.is_active = true")
        .getMany();
      routes.forEach((r) => {
        routeIds.add(r.id);
        routeNames.add(this.normalizeText(r.name));
      });
    }

    if (assignedTehsils.length) {
      const [cities, tehsils] = await Promise.all([
        this.cityRepository
          .createQueryBuilder("city")
          .select(["city.id", "city.name"])
          .where("city.tehsil_id IN (:...ids)", { ids: assignedTehsils })
          .andWhere("city.is_active = true")
          .getMany(),
        this.tehsilRepository
          .createQueryBuilder("tehsil")
          .select(["tehsil.id", "tehsil.name"])
          .where("tehsil.id IN (:...ids)", { ids: assignedTehsils })
          .andWhere("tehsil.is_active = true")
          .getMany(),
      ]);
      cities.forEach((c) => {
        cityIds.add(c.id);
        cityNames.add(this.normalizeText(c.name));
      });
      tehsils.forEach((t) =>
        tehsilNames.add(this.normalizeText(t.name)),
      );
    }

    if (assignedDistricts.length) {
      const [cities, districts, tehsils] = await Promise.all([
        this.cityRepository
          .createQueryBuilder("city")
          .select(["city.id", "city.name"])
          .where("city.district_id IN (:...ids)", { ids: assignedDistricts })
          .andWhere("city.is_active = true")
          .getMany(),
        this.districtRepository
          .createQueryBuilder("district")
          .select(["district.id", "district.name"])
          .where("district.id IN (:...ids)", { ids: assignedDistricts })
          .getMany(),
        this.tehsilRepository
          .createQueryBuilder("tehsil")
          .select(["tehsil.id", "tehsil.name"])
          .where("tehsil.district_id IN (:...ids)", { ids: assignedDistricts })
          .andWhere("tehsil.is_active = true")
          .getMany(),
      ]);
      cities.forEach((c) => {
        cityIds.add(c.id);
        cityNames.add(this.normalizeText(c.name));
      });
      districts.forEach((d) =>
        districtNames.add(this.normalizeText(d.name)),
      );
      tehsils.forEach((t) =>
        tehsilNames.add(this.normalizeText(t.name)),
      );
    }

    if (assignedRegions.length) {
      const [cities, regions, districts, tehsils, routes] = await Promise.all([
        this.cityRepository
          .createQueryBuilder("city")
          .select(["city.id", "city.name"])
          .where("city.region_id IN (:...ids)", { ids: assignedRegions })
          .andWhere("city.is_active = true")
          .getMany(),
        this.regionRepository
          .createQueryBuilder("region")
          .select(["region.id", "region.name"])
          .where("region.id IN (:...ids)", { ids: assignedRegions })
          .getMany(),
        this.districtRepository
          .createQueryBuilder("district")
          .select(["district.id", "district.name"])
          .where("district.region_id IN (:...ids)", { ids: assignedRegions })
          .getMany(),
        this.tehsilRepository
          .createQueryBuilder("tehsil")
          .select(["tehsil.id", "tehsil.name"])
          .where("tehsil.region_id IN (:...ids)", { ids: assignedRegions })
          .andWhere("tehsil.is_active = true")
          .getMany(),
        this.routeRepository
          .createQueryBuilder("route")
          .select(["route.id", "route.name"])
          .where("route.region_id IN (:...ids)", { ids: assignedRegions })
          .andWhere("route.is_active = true")
          .getMany(),
      ]);
      cities.forEach((c) => {
        cityIds.add(c.id);
        cityNames.add(this.normalizeText(c.name));
      });
      regions.forEach((r) => regionNames.add(this.normalizeText(r.name)));
      districts.forEach((d) =>
        districtNames.add(this.normalizeText(d.name)),
      );
      tehsils.forEach((t) =>
        tehsilNames.add(this.normalizeText(t.name)),
      );
      routes.forEach((r) => {
        routeIds.add(r.id);
        routeNames.add(this.normalizeText(r.name));
      });
    }

    if (assignedCountries.length) {
      const [cities, countries, regions, districts, tehsils, routes] =
        await Promise.all([
          this.cityRepository
            .createQueryBuilder("city")
            .select(["city.id", "city.name"])
            .where("city.country_id IN (:...ids)", { ids: assignedCountries })
            .andWhere("city.is_active = true")
            .getMany(),
          this.countryRepository
            .createQueryBuilder("country")
            .select(["country.id", "country.name"])
            .where("country.id IN (:...ids)", { ids: assignedCountries })
            .getMany(),
          this.regionRepository
            .createQueryBuilder("region")
            .select(["region.id", "region.name"])
            .where("region.country_id IN (:...ids)", {
              ids: assignedCountries,
            })
            .getMany(),
          this.districtRepository
            .createQueryBuilder("district")
            .select(["district.id", "district.name"])
            .where("district.country_id IN (:...ids)", {
              ids: assignedCountries,
            })
            .getMany(),
          this.tehsilRepository
            .createQueryBuilder("tehsil")
            .select(["tehsil.id", "tehsil.name"])
            .where("tehsil.country_id IN (:...ids)", { ids: assignedCountries })
            .andWhere("tehsil.is_active = true")
            .getMany(),
          this.routeRepository
            .createQueryBuilder("route")
            .select(["route.id", "route.name"])
            .where("route.country_id IN (:...ids)", { ids: assignedCountries })
            .andWhere("route.is_active = true")
            .getMany(),
        ]);
      cities.forEach((c) => {
        cityIds.add(c.id);
        cityNames.add(this.normalizeText(c.name));
      });
      countries.forEach((c) =>
        countryNames.add(this.normalizeText(c.name)),
      );
      regions.forEach((r) => regionNames.add(this.normalizeText(r.name)));
      districts.forEach((d) =>
        districtNames.add(this.normalizeText(d.name)),
      );
      tehsils.forEach((t) =>
        tehsilNames.add(this.normalizeText(t.name)),
      );
      routes.forEach((r) => {
        routeIds.add(r.id);
        routeNames.add(this.normalizeText(r.name));
      });
    }

    const searchTokens = this.buildSearchTokens(
      cityNames,
      regionNames,
      districtNames,
      tehsilNames,
      routeNames,
    );

    return {
      bypass: false,
      userId: numericUserId,
      cityIds: Array.from(cityIds),
      cityNames: Array.from(cityNames),
      countryNames: Array.from(countryNames),
      regionNames: Array.from(regionNames),
      districtNames: Array.from(districtNames),
      tehsilNames: Array.from(tehsilNames),
      routeIds: Array.from(routeIds),
      routeNames: Array.from(routeNames),
      searchTokens,
    };
  }

  private textContainsAnyToken(
    value: string | null | undefined,
    tokens: string[],
  ): boolean {
    const haystack = this.normalizeText(value);
    if (!haystack || !tokens.length) return false;
    return tokens.some((token) => token && haystack.includes(token));
  }

  private exactNameMatch(
    value: string | null | undefined,
    names: string[],
  ): boolean {
    const normalized = this.normalizeText(value);
    if (!normalized || !names.length) return false;
    return names.includes(normalized);
  }

  private getCreatedById(
    record: { created_by?: { id?: number } | number | null },
  ): number | null {
    const created = record?.created_by;
    if (created == null) return null;
    const id = typeof created === "object" ? created.id : created;
    if (id == null) return null;
    const numeric = Number(id);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
  }

  /** Records created by the current user are always visible under geographic scope. */
  private isRecordCreatedByUser(
    record: { created_by?: { id?: number } | number | null },
    userId: number,
  ): boolean {
    const ownerId = this.getCreatedById(record);
    return ownerId != null && ownerId === userId;
  }

  matchesDonorRecord(
    scope: ResolvedGeographicScope,
    record: DonorGeoRecord,
  ): boolean {
    if (scope.bypass) return true;
    if (this.isScopeEmpty(scope)) return false;

    if (this.textContainsAnyToken(record.geo_search, scope.searchTokens)) {
      return true;
    }
    const exactGeoNames = this.getAllExactGeoNames(scope);
    if (
      exactGeoNames.some((name) =>
        this.normalizeText(record.geo_search).includes(name),
      )
    ) {
      return true;
    }
    if (this.exactNameMatch(record.city, exactGeoNames)) {
      return true;
    }
    if (this.exactNameMatch(record.country, scope.countryNames)) return true;
    if (this.textContainsAnyToken(record.city, scope.searchTokens)) {
      return true;
    }
    if (this.textContainsAnyToken(record.address, scope.searchTokens)) {
      return true;
    }
    return false;
  }

  matchesDonationRecord(
    scope: ResolvedGeographicScope,
    record: DonationGeoRecord,
  ): boolean {
    if (scope.bypass) return true;
    if (this.isScopeEmpty(scope)) return false;

    if (this.matchesDonationGeoSnapshot(scope, record)) {
      return true;
    }

    const donor = record.donor;
    if (donor && this.donationGeoSnapshotIsEmpty(record)) {
      return this.matchesDonorRecord(scope, donor);
    }

    return false;
  }

  private donationGeoSnapshotIsEmpty(record: DonationGeoRecord): boolean {
    return (
      !this.normalizeText(record.geo_search) &&
      !this.normalizeText(record.city) &&
      !this.normalizeText(record.country) &&
      !this.normalizeText(record.address)
    );
  }

  private matchesDonationGeoSnapshot(
    scope: ResolvedGeographicScope,
    record: DonationGeoRecord,
  ): boolean {
    const exactGeoNames = this.getAllExactGeoNames(scope);

    if (this.exactNameMatch(record.city, exactGeoNames)) return true;
    if (this.exactNameMatch(record.country, scope.countryNames)) return true;

    if (this.textContainsAnyToken(record.geo_search, scope.searchTokens)) {
      return true;
    }
    if (this.textContainsAnyToken(record.city, scope.searchTokens)) {
      return true;
    }
    if (this.textContainsAnyToken(record.country, scope.searchTokens)) {
      return true;
    }
    if (this.textContainsAnyToken(record.address, scope.searchTokens)) {
      return true;
    }

    return false;
  }

  matchesDonationBoxRecord(
    scope: ResolvedGeographicScope,
    record: DonationBoxGeoRecord,
  ): boolean {
    if (scope.bypass) return true;
    if (this.isScopeEmpty(scope)) return false;

    if (this.textContainsAnyToken(record.geo_search, scope.searchTokens)) {
      return true;
    }
    const exactGeoNames = this.getAllExactGeoNames(scope);
    if (
      exactGeoNames.some((name) =>
        this.normalizeText(record.geo_search).includes(name),
      )
    ) {
      return true;
    }
    if (
      record.city_id != null &&
      scope.cityIds.includes(Number(record.city_id))
    ) {
      return true;
    }
    if (
      record.route_id != null &&
      scope.routeIds.includes(Number(record.route_id))
    ) {
      return true;
    }
    if (
      this.textContainsAnyToken(
        record.landmark_marketplace,
        scope.searchTokens,
      )
    ) {
      return true;
    }
    return false;
  }

  recordMatches(
    scope: ResolvedGeographicScope,
    entityKey: GeographicEntityKey,
    record:
      | DonorGeoRecord
      | DonationGeoRecord
      | DonationBoxGeoRecord
      | ({ donation_box?: DonationBoxGeoRecord | null } & {
          created_by?: { id?: number } | number | null;
        }),
  ): boolean {
    if (scope.bypass) return true;
    if (this.isRecordCreatedByUser(record, scope.userId)) return true;
    if (this.isScopeEmpty(scope)) return false;

    switch (entityKey) {
      case "donors":
        return this.matchesDonorRecord(scope, record as DonorGeoRecord);
      case "donations":
        return this.matchesDonationRecord(scope, record as DonationGeoRecord);
      case "donation_boxes":
        return this.matchesDonationBoxRecord(
          scope,
          record as DonationBoxGeoRecord,
        );
      case "donation_box_donations": {
        const collection = record as {
          donation_box?: DonationBoxGeoRecord | null;
          created_by?: { id?: number } | number | null;
        };
        const box = collection.donation_box;
        if (!box) return false;
        return this.matchesDonationBoxRecord(scope, box);
      }
      default:
        return true;
    }
  }

  async assertRecordAccess(
    userId: number,
    entityKey: GeographicEntityKey,
    record:
      | DonorGeoRecord
      | DonationGeoRecord
      | DonationBoxGeoRecord
      | { donation_box?: DonationBoxGeoRecord | null },
    userRole?: string,
    userSnapshot?: Partial<User> | null,
  ): Promise<void> {
    const scope = await this.resolveForUser(userId, userRole, userSnapshot);
    if (!this.recordMatches(scope, entityKey, record)) {
      throw new ForbiddenException(
        "You do not have geographic access to this record",
      );
    }
  }

  applyToQuery<T>(
    query: SelectQueryBuilder<T>,
    entityKey: GeographicEntityKey,
    alias: string,
    scope: ResolvedGeographicScope,
    options?: { donationBoxAlias?: string },
  ): void {
    if (scope.bypass) return;

    if (this.isScopeEmpty(scope)) {
      query.andWhere(`${alias}.created_by = :geoOwnOnly_${scope.userId}`, {
        [`geoOwnOnly_${scope.userId}`]: scope.userId,
      });
      return;
    }

    switch (entityKey) {
      case "donors":
        this.applyDonorsQuery(query, alias, scope);
        break;
      case "donations":
        this.applyDonationsQuery(query, alias, scope);
        break;
      case "donation_boxes":
        this.applyDonationBoxesQuery(query, alias, scope);
        break;
      case "donation_box_donations":
        this.applyDonationBoxDonationsQuery(
          query,
          alias,
          scope,
          options?.donationBoxAlias || "donation_box",
        );
        break;
      default:
        break;
    }
  }

  private applyDonorsQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    scope: ResolvedGeographicScope,
  ): void {
    const paramKey = `geoDonor_${scope.userId}`;
    query.andWhere(
      new Brackets((outer) => {
        outer.orWhere(`${alias}.created_by = :${paramKey}_own`, {
          [`${paramKey}_own`]: scope.userId,
        });
        outer.orWhere(
          new Brackets((qb) => {
            this.appendDonorGeoMatchConditions(
              qb,
              alias,
              scope,
              paramKey,
              "donorGeo",
            );
          }),
        );
      }),
    );
  }

  private appendDonorGeoMatchConditions(
    qb: {
      orWhere: WhereExpressionBuilder["orWhere"];
    },
    alias: string,
    scope: ResolvedGeographicScope,
    paramKey: string,
    label: string,
  ): void {
    this.appendContainsConditions(
      qb,
      alias,
      "geo_search",
      scope.searchTokens,
      paramKey,
      `${label}_geo`,
    );
    const exactGeoNames = this.getAllExactGeoNames(scope);
    exactGeoNames.forEach((name, index) => {
      qb.orWhere(
        `LOWER(COALESCE(${alias}.geo_search, '')) LIKE :${paramKey}_${label}_geoExact${index}`,
        { [`${paramKey}_${label}_geoExact${index}`]: `%${name}%` },
      );
    });
    this.appendCityGeoMatchConditions(
      qb,
      alias,
      "city",
      scope,
      paramKey,
      `${label}_city`,
    );
    if (scope.countryNames.length) {
      qb.orWhere(
        `LOWER(TRIM(${alias}.country)) IN (:...${paramKey}_${label}_country)`,
        { [`${paramKey}_${label}_country`]: scope.countryNames },
      );
    }
    this.appendContainsConditions(
      qb,
      alias,
      "country",
      scope.searchTokens,
      paramKey,
      `${label}_countryTok`,
    );
    this.appendContainsConditions(
      qb,
      alias,
      "address",
      scope.searchTokens,
      paramKey,
      `${label}_addr`,
    );
  }

  private applyDonationsQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    scope: ResolvedGeographicScope,
  ): void {
    const paramKey = `geoDonation_${scope.userId}`;

    query.andWhere(
      new Brackets((outer) => {
        outer.orWhere(`${alias}.created_by = :${paramKey}_own`, {
          [`${paramKey}_own`]: scope.userId,
        });
        outer.orWhere(
          new Brackets((qb) => {
            this.appendDonationGeoMatchConditions(
              qb,
              alias,
              scope,
              paramKey,
              "donationGeo",
            );
            qb.orWhere(
              new Brackets((legacyQb) => {
                legacyQb
                  .where(`COALESCE(${alias}.geo_search, '') = ''`)
                  .andWhere(`COALESCE(${alias}.city, '') = ''`)
                  .andWhere(`COALESCE(${alias}.country, '') = ''`)
                  .andWhere(`COALESCE(${alias}.address, '') = ''`)
                  .andWhere(`${alias}.donor_id IS NOT NULL`)
                  .andWhere(
                    `${alias}.donor_id IN (${this.buildDonorGeoSubquery(scope, paramKey)})`,
                  );
              }),
            );
          }),
        );
      }),
    );

    this.bindDonorGeoSubqueryParameters(query, scope, paramKey);
  }

  private appendDonationGeoMatchConditions(
    qb: {
      orWhere: WhereExpressionBuilder["orWhere"];
    },
    alias: string,
    scope: ResolvedGeographicScope,
    paramKey: string,
    label: string,
  ): void {
    this.appendContainsConditions(
      qb,
      alias,
      "geo_search",
      scope.searchTokens,
      paramKey,
      `${label}_geo`,
    );
    this.appendCityGeoMatchConditions(
      qb,
      alias,
      "city",
      scope,
      paramKey,
      `${label}_city`,
    );
    if (scope.countryNames.length) {
      qb.orWhere(
        `LOWER(TRIM(${alias}.country)) IN (:...${paramKey}_${label}_country)`,
        { [`${paramKey}_${label}_country`]: scope.countryNames },
      );
    }
    this.appendContainsConditions(
      qb,
      alias,
      "country",
      scope.searchTokens,
      paramKey,
      `${label}_countryTok`,
    );
    this.appendContainsConditions(
      qb,
      alias,
      "address",
      scope.searchTokens,
      paramKey,
      `${label}_addr`,
    );
  }

  private buildDonorGeoSubquery(
    scope: ResolvedGeographicScope,
    paramKey: string,
  ): string {
    const parts: string[] = [];
    const exactGeoNames = this.getAllExactGeoNames(scope);
    if (exactGeoNames.length) {
      parts.push(
        `LOWER(TRIM(d.city)) IN (:...${paramKey}_offlineGeoNames)`,
      );
      exactGeoNames.forEach((_, index) => {
        parts.push(
          `LOWER(COALESCE(d.geo_search, '')) LIKE :${paramKey}_offlineGeoExact${index}`,
        );
      });
    }
    if (scope.countryNames.length) {
      parts.push(
        `LOWER(TRIM(d.country)) IN (:...${paramKey}_offlineCountryNames)`,
      );
    }
    scope.searchTokens.forEach((token, index) => {
      parts.push(
        `LOWER(COALESCE(d.geo_search, '')) LIKE :${paramKey}_offlineGeoTok${index}`,
      );
      parts.push(
        `LOWER(COALESCE(d.city, '')) LIKE :${paramKey}_offlineCityTok${index}`,
      );
      parts.push(
        `LOWER(COALESCE(d.country, '')) LIKE :${paramKey}_offlineCountryTok${index}`,
      );
      parts.push(
        `LOWER(COALESCE(d.address, '')) LIKE :${paramKey}_offlineAddr${index}`,
      );
    });
    if (!parts.length) {
      return "SELECT d.id FROM donors d WHERE 1 = 0";
    }
    return `SELECT d.id FROM donors d WHERE (${parts.join(" OR ")})`;
  }

  private bindDonorGeoSubqueryParameters<T>(
    query: SelectQueryBuilder<T>,
    scope: ResolvedGeographicScope,
    paramKey: string,
  ): void {
    const exactGeoNames = this.getAllExactGeoNames(scope);
    if (exactGeoNames.length) {
      query.setParameter(`${paramKey}_offlineGeoNames`, exactGeoNames);
      exactGeoNames.forEach((name, index) => {
        query.setParameter(
          `${paramKey}_offlineGeoExact${index}`,
          `%${name}%`,
        );
      });
    }
    if (scope.countryNames.length) {
      query.setParameter(
        `${paramKey}_offlineCountryNames`,
        scope.countryNames,
      );
    }
    scope.searchTokens.forEach((token, index) => {
      query.setParameter(`${paramKey}_offlineGeoTok${index}`, `%${token}%`);
      query.setParameter(`${paramKey}_offlineCityTok${index}`, `%${token}%`);
      query.setParameter(
        `${paramKey}_offlineCountryTok${index}`,
        `%${token}%`,
      );
      query.setParameter(`${paramKey}_offlineAddr${index}`, `%${token}%`);
    });
  }

  private appendDonationBoxGeoMatchConditions(
    qb: {
      orWhere: WhereExpressionBuilder["orWhere"];
    },
    alias: string,
    scope: ResolvedGeographicScope,
    paramKey: string,
    label: string,
  ): void {
    this.appendContainsConditions(
      qb,
      alias,
      "geo_search",
      scope.searchTokens,
      paramKey,
      `${label}_geo`,
    );
    const exactGeoNames = this.getAllExactGeoNames(scope);
    exactGeoNames.forEach((name, index) => {
      qb.orWhere(
        `LOWER(COALESCE(${alias}.geo_search, '')) LIKE :${paramKey}_${label}_geoExact${index}`,
        { [`${paramKey}_${label}_geoExact${index}`]: `%${name}%` },
      );
    });
  }

  private applyDonationBoxesQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    scope: ResolvedGeographicScope,
  ): void {
    const paramKey = `geoBox_${scope.userId}`;
    query.andWhere(
      new Brackets((outer) => {
        outer.orWhere(`${alias}.created_by = :${paramKey}_own`, {
          [`${paramKey}_own`]: scope.userId,
        });
        outer.orWhere(
          new Brackets((qb) => {
            if (scope.cityIds.length) {
              qb.orWhere(`${alias}.city_id IN (:...${paramKey}_cityIds)`, {
                [`${paramKey}_cityIds`]: scope.cityIds,
              });
            }
            if (scope.routeIds.length) {
              qb.orWhere(`${alias}.route_id IN (:...${paramKey}_routeIds)`, {
                [`${paramKey}_routeIds`]: scope.routeIds,
              });
            }
            this.appendContainsConditions(
              qb,
              alias,
              "landmark_marketplace",
              scope.searchTokens,
              paramKey,
              "landmark",
            );
            this.appendDonationBoxGeoMatchConditions(
              qb,
              alias,
              scope,
              paramKey,
              "box",
            );
          }),
        );
      }),
    );
  }

  private applyDonationBoxDonationsQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    scope: ResolvedGeographicScope,
    boxAlias: string,
  ): void {
    const paramKey = `geoBoxDon_${scope.userId}`;
    query.andWhere(
      new Brackets((outer) => {
        outer.orWhere(`${alias}.created_by = :${paramKey}_own`, {
          [`${paramKey}_own`]: scope.userId,
        });
        outer.orWhere(
          new Brackets((qb) => {
            if (scope.cityIds.length) {
              qb.orWhere(`${boxAlias}.city_id IN (:...${paramKey}_cityIds)`, {
                [`${paramKey}_cityIds`]: scope.cityIds,
              });
            }
            if (scope.routeIds.length) {
              qb.orWhere(`${boxAlias}.route_id IN (:...${paramKey}_routeIds)`, {
                [`${paramKey}_routeIds`]: scope.routeIds,
              });
            }
            this.appendContainsConditions(
              qb,
              boxAlias,
              "landmark_marketplace",
              scope.searchTokens,
              paramKey,
              "landmark",
            );
            this.appendDonationBoxGeoMatchConditions(
              qb,
              boxAlias,
              scope,
              paramKey,
              "box",
            );
          }),
        );
      }),
    );
  }

  private appendContainsConditions(
    qb: {
      orWhere: WhereExpressionBuilder["orWhere"];
    },
    alias: string,
    column: string,
    tokens: string[],
    paramKey: string,
    label: string,
  ): void {
    tokens.forEach((token, index) => {
      const paramName = `${paramKey}_${label}${index}`;
      qb.orWhere(`LOWER(COALESCE(${alias}.${column}, '')) LIKE :${paramName}`, {
        [paramName]: `%${token}%`,
      });
    });
  }

}
