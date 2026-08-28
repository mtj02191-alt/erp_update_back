import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("website_home_hero_slides")
export class WebsiteHomeHeroSlide extends BaseEntity {
  /** Admin label (not shown on website). */
  @Column({ type: "varchar", nullable: true })
  title: string | null;

  @Column({ type: "varchar" })
  desktop_image_url: string;

  @Column({ type: "varchar" })
  mobile_image_url: string;

  /** Donate / page path, e.g. /donate/health */
  @Column({ type: "varchar", nullable: true })
  link: string | null;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
