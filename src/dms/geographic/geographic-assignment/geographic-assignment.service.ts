import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Country } from "../countries/entities/country.entity";
import { Region } from "../regions/entities/region.entity";
import { District } from "../districts/entities/district.entity";
import { Tehsil } from "../tehsils/entities/tehsil.entity";
import { City } from "../cities/entities/city.entity";
import { Route } from "../routes/entities/route.entity";
import {
  GeographicAssignmentIds,
  GeographicAssignmentItem,
} from "./geographic-assignment.types";

@Injectable()
export class GeographicAssignmentService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Tehsil)
    private readonly tehsilRepository: Repository<Tehsil>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  async search(query: string, limit = 30): Promise<GeographicAssignmentItem[]> {
    const term = String(query || "").trim();
    if (term.length < 2) {
      return [];
    }

    const like = `%${term.toLowerCase()}%`;
    const perType = Math.max(5, Math.ceil(limit / 6));

    const [
      countries,
      regions,
      districts,
      tehsils,
      cities,
      routes,
    ] = await Promise.all([
      this.countryRepository
        .createQueryBuilder("c")
        .select(["c.id", "c.name"])
        .where("c.is_active = true")
        .andWhere("LOWER(c.name) LIKE :like", { like })
        .orderBy("c.name", "ASC")
        .take(perType)
        .getMany(),
      this.regionRepository
        .createQueryBuilder("r")
        .leftJoin("r.country", "co")
        .select(["r.id", "r.name", "co.name"])
        .where("r.is_active = true")
        .andWhere("LOWER(r.name) LIKE :like", { like })
        .orderBy("r.name", "ASC")
        .take(perType)
        .getMany(),
      this.districtRepository
        .createQueryBuilder("d")
        .leftJoin("d.region", "re")
        .leftJoin("d.country", "co")
        .select(["d.id", "d.name", "re.name", "co.name"])
        .where("d.is_active = true")
        .andWhere("LOWER(d.name) LIKE :like", { like })
        .orderBy("d.name", "ASC")
        .take(perType)
        .getMany(),
      this.tehsilRepository
        .createQueryBuilder("t")
        .leftJoin("t.district", "di")
        .leftJoin("t.region", "re")
        .select(["t.id", "t.name", "di.name", "re.name"])
        .where("t.is_active = true")
        .andWhere("LOWER(t.name) LIKE :like", { like })
        .orderBy("t.name", "ASC")
        .take(perType)
        .getMany(),
      this.cityRepository
        .createQueryBuilder("ci")
        .leftJoin("ci.tehsil", "te")
        .leftJoin("ci.district", "di")
        .leftJoin("ci.region", "re")
        .select(["ci.id", "ci.name", "te.name", "di.name", "re.name"])
        .where("ci.is_active = true")
        .andWhere("LOWER(ci.name) LIKE :like", { like })
        .orderBy("ci.name", "ASC")
        .take(perType)
        .getMany(),
      this.routeRepository
        .createQueryBuilder("ro")
        .leftJoin("ro.region", "re")
        .leftJoin("ro.country", "co")
        .select(["ro.id", "ro.name", "re.name", "co.name"])
        .where("ro.is_active = true")
        .andWhere("LOWER(ro.name) LIKE :like", { like })
        .orderBy("ro.name", "ASC")
        .take(perType)
        .getMany(),
    ]);

    const items: GeographicAssignmentItem[] = [
      ...countries.map((c) => ({
        type: "country" as const,
        id: c.id,
        name: c.name,
      })),
      ...regions.map((r) => ({
        type: "region" as const,
        id: r.id,
        name: r.name,
        breadcrumb: [r.country?.name].filter(Boolean).join(" › "),
      })),
      ...districts.map((d) => ({
        type: "district" as const,
        id: d.id,
        name: d.name,
        breadcrumb: [d.country?.name, d.region?.name].filter(Boolean).join(" › "),
      })),
      ...tehsils.map((t) => ({
        type: "tehsil" as const,
        id: t.id,
        name: t.name,
        breadcrumb: [t.region?.name, t.district?.name].filter(Boolean).join(" › "),
      })),
      ...cities.map((c) => ({
        type: "city" as const,
        id: c.id,
        name: c.name,
        breadcrumb: [c.region?.name, c.district?.name, c.tehsil?.name]
          .filter(Boolean)
          .join(" › "),
      })),
      ...routes.map((r) => ({
        type: "route" as const,
        id: r.id,
        name: r.name,
        breadcrumb: [r.country?.name, r.region?.name].filter(Boolean).join(" › "),
      })),
    ];

    return items.slice(0, limit);
  }

  async resolve(
    ids: GeographicAssignmentIds,
  ): Promise<GeographicAssignmentItem[]> {
    const items: GeographicAssignmentItem[] = [];

    if (ids.countries?.length) {
      const rows = await this.countryRepository.find({
        where: { id: In(ids.countries), is_active: true },
        select: ["id", "name"],
      });
      items.push(
        ...rows.map((r) => ({
          type: "country" as const,
          id: r.id,
          name: r.name,
        })),
      );
    }

    if (ids.regions?.length) {
      const rows = await this.regionRepository
        .createQueryBuilder("r")
        .leftJoin("r.country", "co")
        .select(["r.id", "r.name", "co.name"])
        .where("r.id IN (:...ids)", { ids: ids.regions })
        .andWhere("r.is_active = true")
        .getMany();
      items.push(
        ...rows.map((r) => ({
          type: "region" as const,
          id: r.id,
          name: r.name,
          breadcrumb: r.country?.name,
        })),
      );
    }

    if (ids.districts?.length) {
      const rows = await this.districtRepository
        .createQueryBuilder("d")
        .leftJoin("d.region", "re")
        .leftJoin("d.country", "co")
        .select(["d.id", "d.name", "re.name", "co.name"])
        .where("d.id IN (:...ids)", { ids: ids.districts })
        .andWhere("d.is_active = true")
        .getMany();
      items.push(
        ...rows.map((d) => ({
          type: "district" as const,
          id: d.id,
          name: d.name,
          breadcrumb: [d.country?.name, d.region?.name].filter(Boolean).join(" › "),
        })),
      );
    }

    if (ids.tehsils?.length) {
      const rows = await this.tehsilRepository
        .createQueryBuilder("t")
        .leftJoin("t.district", "di")
        .leftJoin("t.region", "re")
        .select(["t.id", "t.name", "di.name", "re.name"])
        .where("t.id IN (:...ids)", { ids: ids.tehsils })
        .andWhere("t.is_active = true")
        .getMany();
      items.push(
        ...rows.map((t) => ({
          type: "tehsil" as const,
          id: t.id,
          name: t.name,
          breadcrumb: [t.region?.name, t.district?.name].filter(Boolean).join(" › "),
        })),
      );
    }

    if (ids.cities?.length) {
      const rows = await this.cityRepository
        .createQueryBuilder("ci")
        .leftJoin("ci.tehsil", "te")
        .leftJoin("ci.district", "di")
        .leftJoin("ci.region", "re")
        .select(["ci.id", "ci.name", "te.name", "di.name", "re.name"])
        .where("ci.id IN (:...ids)", { ids: ids.cities })
        .andWhere("ci.is_active = true")
        .getMany();
      items.push(
        ...rows.map((c) => ({
          type: "city" as const,
          id: c.id,
          name: c.name,
          breadcrumb: [c.region?.name, c.district?.name, c.tehsil?.name]
            .filter(Boolean)
            .join(" › "),
        })),
      );
    }

    if (ids.routes?.length) {
      const rows = await this.routeRepository
        .createQueryBuilder("ro")
        .leftJoin("ro.region", "re")
        .leftJoin("ro.country", "co")
        .select(["ro.id", "ro.name", "re.name", "co.name"])
        .where("ro.id IN (:...ids)", { ids: ids.routes })
        .andWhere("ro.is_active = true")
        .getMany();
      items.push(
        ...rows.map((r) => ({
          type: "route" as const,
          id: r.id,
          name: r.name,
          breadcrumb: [r.country?.name, r.region?.name].filter(Boolean).join(" › "),
        })),
      );
    }

    return items;
  }
}
