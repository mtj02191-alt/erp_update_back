import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { DonationInKindItem } from "../donation_in_kind_items/entities/donation_in_kind_item.entity";
import { Donation } from "../../../donations/entities/donation.entity";

export enum DonationInKindCategory {
  CLOTHING = "clothing",
  FOOD = "food",
  MEDICAL = "medical",
  EDUCATIONAL = "educational",
  ELECTRONICS = "electronics",
  FURNITURE = "furniture",
  BOOKS = "books",
  TOYS = "toys",
  HOUSEHOLD = "household",
  OTHER = "other",
}

export enum DonationInKindCondition {
  NEW = "new",
  LIKE_NEW = "like_new",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
}

@Entity("donation_in_kind")
// @Index('idx_donation_id', ['donation_id'])
// @Index('idx_item_id', ['item_id'])
// @Index('idx_category', ['category'])
// @Index('idx_condition', ['condition'])
// @Index('idx_collection_date', ['collection_date'])
export class DonationInKind extends BaseEntity {
  // Required Fields
  @Column()
  donation_id: string; // foreign key to donation but keep below columns as it is

  @Column()
  item_name: string;

  @Column({ type: "text", nullable: true })
  category: string;

  @Column({
    type: "enum",
    enum: DonationInKindCondition,
    nullable: false,
  })
  condition: DonationInKindCondition;

  @Column({ type: "int", nullable: false })
  quantity: number;

  @Column({ type: "date", nullable: false })
  collection_date: Date;

  // Optional Fields
  @Column({ nullable: true })
  item_id?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  estimated_value?: number;

  @Column({ nullable: true })
  brand?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ nullable: true })
  size?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true })
  collection_location?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  // Relationships
  @ManyToOne(() => DonationInKindItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "item_id" })
  donation_in_kind_item?: DonationInKindItem;

  @ManyToOne(() => Donation, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "donation_id" })
  donation: Donation;
}
