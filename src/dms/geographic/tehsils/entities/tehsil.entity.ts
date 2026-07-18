import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../../utils/base_utils/entities/baseEntity";
import { Country } from "../../countries/entities/country.entity";
import { Region } from "../../regions/entities/region.entity";
import { District } from "../../districts/entities/district.entity";
import { City } from "../../cities/entities/city.entity";

@Entity("tehsils")
@Index("idx_tehsil_name", ["name"])
@Index("idx_tehsil_district", ["district_id"])
@Index("idx_tehsil_region", ["region_id"])
@Index("idx_tehsil_country", ["country_id"])
export class Tehsil extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 10, nullable: true })
  code: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "text", nullable: true })
  description: string;

  // Foreign Keys
  @Column()
  district_id: number;

  @Column()
  region_id: number;

  @Column()
  country_id: number;

  // Relationships
  @ManyToOne(() => District, (district) => district.tehsils, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "district_id" })
  district: District;

  @ManyToOne(() => Region, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "region_id" })
  region: Region;

  @ManyToOne(() => Country, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "country_id" })
  country: Country;

  @OneToMany(() => City, (city) => city.tehsil, { cascade: true })
  cities: City[];
}
