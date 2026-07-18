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
import { City } from "../../cities/entities/city.entity";
import { District } from "../../districts/entities/district.entity";

@Entity("regions")
@Index("idx_region_name", ["name"])
@Index("idx_region_country", ["country_id"])
export class Region extends BaseEntity {
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
  country_id: number;

  // Relationships
  @ManyToOne(() => Country, (country) => country.regions, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "country_id" })
  country: Country;

  @OneToMany(() => District, (district) => district.region, { cascade: true })
  districts: District[];

  @OneToMany(() => City, (city) => city.region, { cascade: true })
  cities: City[];
}
