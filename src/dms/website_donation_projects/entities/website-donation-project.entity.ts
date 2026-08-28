import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { WebsiteDonationInitiative } from "./website-donation-initiative.entity";

@Entity("website_donation_projects")
export class WebsiteDonationProject extends BaseEntity {
  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: "varchar", default: "General" })
  category: string;

  @Column({ type: "varchar", nullable: true })
  icon_key: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: "boolean", default: false })
  is_new: boolean;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  @Column({ type: "varchar", nullable: true })
  template_code: string | null;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  /** Card image on public /projects listing page. */
  @Column({ type: "varchar", nullable: true })
  listing_image_url: string | null;

  /** Structured project page content (header, subProjects, FAQs, testimonials). */
  @Column({ type: "jsonb", nullable: true })
  page_content: Record<string, unknown> | null;

  @OneToMany(
    () => WebsiteDonationInitiative,
    (initiative) => initiative.project,
    { cascade: true },
  )
  initiatives: WebsiteDonationInitiative[];
}
