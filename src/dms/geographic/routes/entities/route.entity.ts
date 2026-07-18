import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../../utils/base_utils/entities/baseEntity";
import { City } from "../../cities/entities/city.entity";
import { Region } from "../../regions/entities/region.entity";
import { Country } from "../../countries/entities/country.entity";

export enum RouteType {
  MAIN = "main",
  SECONDARY = "secondary",
  LOCAL = "local",
  HIGHWAY = "highway",
  STREET = "street",
  OTHER = "other",
}

@Entity("routes")
@Index("idx_route_name", ["name"])
@Index("idx_route_type", ["route_type"])
export class Route extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, nullable: true })
  code: string;

  @Column({
    type: "enum",
    enum: RouteType,
    default: RouteType.STREET,
  })
  route_type: RouteType;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  distance_km: number;

  // Foreign Keys
  @Column()
  region_id: number;

  @Column()
  country_id: number;

  // Relationships
  @ManyToMany(() => City, (city) => city.routes, { cascade: true })
  @JoinTable({
    name: "cities_routes",
    joinColumn: { name: "route_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "city_id", referencedColumnName: "id" },
  })
  cities: City[];

  @ManyToOne(() => Region, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "region_id" })
  region: Region;

  @ManyToOne(() => Country, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "country_id" })
  country: Country;
}
