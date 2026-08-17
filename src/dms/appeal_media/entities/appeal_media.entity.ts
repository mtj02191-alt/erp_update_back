import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Appeal } from "../../appeals/entities/appeal.entity";

export enum AppealMediaType {
  HERO = "hero",
  GALLERY = "gallery",
  UPDATE = "update",
}

@Entity("appeal_media")
@Index("idx_appeal_media_appeal_id", ["appeal_id"])
export class AppealMedia extends BaseEntity {
  @ManyToOne(() => Appeal, (appeal) => appeal.media, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "appeal_id" })
  appeal: Appeal;

  @Column({ type: "bigint" })
  appeal_id: number;

  @Column({ type: "text" })
  url: string;

  @Column({
    type: "varchar",
    length: 20,
    default: AppealMediaType.GALLERY,
  })
  media_type: AppealMediaType;

  @Column({ type: "varchar", length: 300, nullable: true })
  caption: string | null;

  @Column({ type: "int", default: 0 })
  sort_order: number;
}
