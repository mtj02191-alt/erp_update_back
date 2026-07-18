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
import { Tehsil } from "../../tehsils/entities/tehsil.entity";

@Entity("districts")
@Index("idx_district_name", ["name"])
@Index("idx_district_region", ["region_id"])
@Index("idx_district_country", ["country_id"])
export class District extends BaseEntity {
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
  region_id: number;

  @Column()
  country_id: number;

  // Relationships
  @ManyToOne(() => Region, (region) => region.districts, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "region_id" })
  region: Region;

  @ManyToOne(() => Country, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "country_id" })
  country: Country;

  @OneToMany(() => Tehsil, (tehsil) => tehsil.district, { cascade: true })
  tehsils: Tehsil[];
}
