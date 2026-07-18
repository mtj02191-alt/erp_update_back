import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { SurveyQuestionReport } from "./survey_question_report.entity";

@Entity("survey_reports")
export class SurveyReport extends BaseEntity {
  @Column({ type: "int" })
  survey_id: number;

  @ManyToOne("Survey", "reports", { onDelete: "CASCADE" })
  @JoinColumn({ name: "survey_id" })
  survey: any;

  @Column({ type: "int", default: 0 })
  total_submissions: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  generated_at: Date;

  @OneToMany(() => SurveyQuestionReport, (qr) => qr.surveyReport)
  questionReports: SurveyQuestionReport[];
}
