import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { SurveyQuestion } from "./survey_question.entity";
import { SurveySubmission } from "./survey_submission.entity";
import { SurveyReport } from "./survey_report.entity";

export enum SurveyStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  CLOSED = "closed",
}

@Entity("surveys")
export class Survey extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: SurveyStatus.DRAFT,
  })
  status: SurveyStatus;

  @Column({ type: "timestamp", nullable: true })
  start_at: Date | null;

  @Column({ type: "timestamp", nullable: true })
  end_at: Date | null;

  @OneToMany(() => SurveyQuestion, (q) => q.survey)
  questions: SurveyQuestion[];

  @OneToMany(() => SurveySubmission, (s) => s.survey)
  submissions: SurveySubmission[];

  @OneToMany(() => SurveyReport, (r) => r.survey)
  reports: SurveyReport[];
}
