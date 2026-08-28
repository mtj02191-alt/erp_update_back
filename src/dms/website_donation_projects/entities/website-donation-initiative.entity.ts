import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { WebsiteDonationProject } from "./website-donation-project.entity";

@Entity("website_donation_initiatives")
export class WebsiteDonationInitiative extends BaseEntity {
  @Column()
  slug: string;

  @Column()
  title: string;

  @Column({ type: "varchar", nullable: true })
  subtitle: string | null;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", nullable: true })
  duration: string | null;

  @Column({ type: "varchar", nullable: true })
  icon_key: string | null;

  @Column({ type: "varchar", nullable: true })
  template_code: string | null;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @ManyToOne(() => WebsiteDonationProject, (project) => project.initiatives, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project: WebsiteDonationProject;

  @Column()
  project_id: number;
}
