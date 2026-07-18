import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Survey } from "./survey.entity";
import { SurveyQuestionOption } from "./survey_question_option.entity";
import { SurveyAnswer } from "./survey_answer.entity";

export enum QuestionType {
  MCQ_SINGLE = "mcq_single",
  MCQ_MULTIPLE = "mcq_multiple",
  YES_NO = "yes_no",
  RATING_1_5 = "rating_1_5",
  SHORT_TEXT = "short_text",
}

@Entity("survey_questions")
export class SurveyQuestion extends BaseEntity {
  @Column({ type: "int" })
  survey_id: number;

  @ManyToOne(() => Survey, (s) => s.questions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "survey_id" })
  survey: Survey;

  @Column({ type: "text" })
  question_text: string;

  @Column({
    type: "varchar",
    length: 20,
  })
  question_type: QuestionType;

  @Column({ type: "boolean", default: true })
  is_required: boolean;

  @Column({ type: "int", default: 0 })
  question_no: number;

  @OneToMany(() => SurveyQuestionOption, (o) => o.question)
  options: SurveyQuestionOption[];

  @OneToMany(() => SurveyAnswer, (a) => a.question)
  answers: SurveyAnswer[];
}
