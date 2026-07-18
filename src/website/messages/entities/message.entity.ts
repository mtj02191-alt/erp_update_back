import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("web_messages")
export class WebMessage extends BaseEntity {
  @Column({ nullable: true, default: null })
  name: string;

  @Column({ nullable: true, default: null })
  email: string;

  @Column({ nullable: true, default: null })
  phone: string;

  @Column({ nullable: true, default: null })
  subject: string;

  @Column({ nullable: true, default: null })
  message: string;

  @Column({ nullable: true, default: null })
  status: string;

  @Column({ nullable: true, default: false })
  is_responded: boolean;
}
