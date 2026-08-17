import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Appeal } from "../../appeals/entities/appeal.entity";

@Entity("appeal_updates")
@Index("idx_appeal_updates_appeal_id", ["appeal_id"])
export class AppealUpdate extends BaseEntity {
  @ManyToOne(() => Appeal, (appeal) => appeal.updates, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "appeal_id" })
  appeal: Appeal;

  @Column({ type: "bigint" })
  appeal_id: number;

  @Column({ type: "varchar", length: 250 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "timestamptz", nullable: true })
  published_at: Date | null;

  @Column({ type: "boolean", default: true })
  is_published: boolean;

  @Column({ type: "boolean", default: false })
  is_highlighted: boolean;

  @Column({ type: "jsonb", nullable: true })
  image_urls: string[] | null;
}
