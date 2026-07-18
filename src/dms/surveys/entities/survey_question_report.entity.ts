import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { SurveyReport } from "./survey_report.entity";
import { SurveyQuestion } from "./survey_question.entity";

@Entity("survey_question_reports")
export class SurveyQuestionReport extends BaseEntity {
  @Column({ type: "int" })
  survey_id: number;

  @Column({ type: "int" })
  question_id: number;

  @ManyToOne(() => SurveyQuestion, { onDelete: "CASCADE" })
  @JoinColumn({ name: "question_id" })
  question: SurveyQuestion;

  @Column({ type: "int" })
  report_id: number;

  @ManyToOne(() => SurveyReport, (r) => r.questionReports, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "report_id" })
  surveyReport: SurveyReport;

  @Column({ type: "int", default: 0 })
  responses_count: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  avg_rating: number | null;

  @Column({ type: "jsonb", nullable: true })
  rating_counts: Record<number, number> | null;

  @Column({ type: "jsonb", nullable: true })
  option_counts: Record<string, number> | null;
}
