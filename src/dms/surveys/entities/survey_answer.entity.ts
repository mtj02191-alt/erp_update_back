import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { SurveySubmission } from "./survey_submission.entity";
import { SurveyQuestion } from "./survey_question.entity";

@Entity("survey_answers")
export class SurveyAnswer extends BaseEntity {
  @Column({ type: "int" })
  submission_id: number;

  @ManyToOne(() => SurveySubmission, (s) => s.answers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "submission_id" })
  submission: SurveySubmission;

  @Column({ type: "int" })
  question_id: number;

  @ManyToOne(() => SurveyQuestion, (q) => q.answers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "question_id" })
  question: SurveyQuestion;

  @Column({ type: "varchar", length: 10, nullable: true })
  answer_option_key: string | null;

  @Column({ type: "jsonb", nullable: true })
  answer_option_keys: string[] | null;

  @Column({ type: "int", nullable: true })
  answer_rating: number | null;

  @Column({ type: "text", nullable: true })
  answer_text: string | null;
}
