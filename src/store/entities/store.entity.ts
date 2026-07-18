import { User } from "../../users/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("store")
export class StoreEntity {
  @PrimaryGeneratedColumn()
  id: number;
}
