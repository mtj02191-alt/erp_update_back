import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("qr_codes")
export class QrCode {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Index()
  @Column({ type: "varchar", length: 80, nullable: true })
  project_id: string | null;

  @Index()
  @Column({ type: "varchar", length: 80, nullable: true })
  campaign: string | null;

  @Index()
  @Column({ type: "varchar", length: 80, nullable: true })
  label: string | null; // e.g., BOX-001 / POSTER-01

  @Column({ type: "text" })
  target_url: string;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;
}
