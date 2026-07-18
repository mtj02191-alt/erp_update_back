import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("gold_silver_prices")
@Index("idx_gold_silver_price_date", ["price_date"])
@Index("idx_gold_silver_price_created", ["created_at"])
export class GoldSilverPrice extends BaseEntity {
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  gold_price: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  silver_price: number;

  @Column({ type: "date", nullable: false, unique: true })
  price_date: Date;

  @Column({ type: "text", nullable: true })
  api_response: string; // Store raw API response for reference
}
