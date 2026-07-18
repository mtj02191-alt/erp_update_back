import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Survey } from "./survey.entity";
import { User } from "../../../users/user.entity";
import { SurveyAnswer } from "./survey_answer.entity";

@Entity("survey_submissions")
export class SurveySubmission extends BaseEntity {
  @Column({ type: "int" })
  survey_id: number;

  @ManyToOne(() => Survey, (s) => s.submissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "survey_id" })
  survey: Survey;

  @Column({ type: "int" })
  surveyed_by: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "surveyed_by" })
  surveyedByUser: User;

  @Column({ type: "varchar", length: 255, nullable: true })
  device_id: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  submitted_at: Date;

  @OneToMany(() => SurveyAnswer, (a) => a.submission)
  answers: SurveyAnswer[];
}
