import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { SurveyQuestion } from "./survey_question.entity";

@Entity("survey_question_options")
export class SurveyQuestionOption extends BaseEntity {
  @Column({ type: "int" })
  question_id: number;

  @ManyToOne(() => SurveyQuestion, (q) => q.options, { onDelete: "CASCADE" })
  @JoinColumn({ name: "question_id" })
  question: SurveyQuestion;

  @Column({ type: "varchar", length: 10 })
  option_key: string;

  @Column({ type: "varchar", length: 255 })
  option_text: string;
}
