import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Route } from "../../geographic/routes/entities/route.entity";
import { City } from "../../geographic/cities/entities/city.entity";
import { User } from "../../../users/user.entity";

export enum BoxType {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  CUSTOM = "custom",
}

export enum BoxStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  MAINTENANCE = "maintenance",
  RETIRED = "retired",
}

export enum CollectionFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi-weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  AS_NEEDED = "as-needed",
}

@Entity("donation_boxes")
@Index("idx_donation_box_route", ["route_id"])
export class DonationBox extends BaseEntity {
  /** External box number from field sheets (e.g. FSD-L-141). Alias: Box ID No. / Box No. */
  @Column({ name: "box_id_no", type: "varchar", nullable: true, unique: true })
  box_id_no: string | null;

  /** Physical key number — optional; duplicates allowed across shops. */
  @Column({ type: "varchar", nullable: true, default: null })
  key_no: string | null;

  // Location Details - Foreign Key
  @Column({ nullable: true })
  route_id: number | null;

  @Column({ nullable: true })
  city_id: number | null;

  // Shop Details
  @Column()
  shop_name: string;

  @Column({ nullable: true })
  shopkeeper: string;

  @Column({ nullable: true })
  cell_no: string;

  /** Free-text shop address from field sheets. */
  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ nullable: true })
  landmark_marketplace: string;

  /** Normalized search blob from route, region, city, landmark, and shop name. */
  @Column({ type: "text", nullable: true, default: null })
  geo_search: string;

  // Box Details
  @Column({
    type: "enum",
    enum: BoxType,
    default: BoxType.MEDIUM,
  })
  box_type: BoxType;

  @Column({
    type: "enum",
    enum: BoxStatus,
    default: BoxStatus.ACTIVE,
  })
  status: BoxStatus;

  @Column({
    type: "enum",
    enum: CollectionFrequency,
    default: CollectionFrequency.WEEKLY,
  })
  frequency: CollectionFrequency;

  @Column({ type: "date" })
  active_since: Date;

  @Column({ type: "date", nullable: true })
  last_collection_date: Date;

  // Collection Statistics
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total_collected: number;

  @Column({ type: "int", default: 0 })
  collection_count: number;

  // Additional Info
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ default: true })
  is_active: boolean;

  // Relationships
  @ManyToOne(() => Route, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "route_id" })
  route: Route | null;

  @ManyToOne(() => City, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "city_id" })
  city: City | null;

  @ManyToMany(() => User, (user) => user.donationBoxes, { cascade: true })
  @JoinTable({
    name: "donation_box_users",
    joinColumn: { name: "donation_box_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "user_id", referencedColumnName: "id" },
  })
  assignedUsers: User[];
}
