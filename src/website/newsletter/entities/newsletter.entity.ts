import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("newsletter_subscribers")
export class NewsletterSubscriber extends BaseEntity {
  @Column({ nullable: true, default: null })
  email: string;

  @Column({ nullable: true, default: null })
  first_name: string;

  @Column({ nullable: true, default: null })
  last_name: string;
}
