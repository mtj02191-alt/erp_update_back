import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../../utils/base_utils/entities/baseEntity";

export enum ItemCategory {
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

@Entity("donation_in_kind_item")
export class DonationInKindItem extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // Category (Required - as requested)
  @Column({ type: "text", nullable: true })
  category: string;
}
