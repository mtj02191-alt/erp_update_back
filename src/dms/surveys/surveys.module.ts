import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { SurveysService } from "./surveys.service";
import { SurveysController } from "./surveys.controller";
import { Survey } from "./entities/survey.entity";
import { SurveyQuestion } from "./entities/survey_question.entity";
import { SurveyQuestionOption } from "./entities/survey_question_option.entity";
import { SurveySubmission } from "./entities/survey_submission.entity";
import { SurveyAnswer } from "./entities/survey_answer.entity";
import { SurveyReport } from "./entities/survey_report.entity";
import { SurveyQuestionReport } from "./entities/survey_question_report.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { User } from "../../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Survey,
      SurveyQuestion,
      SurveyQuestionOption,
      SurveySubmission,
      SurveyAnswer,
      SurveyReport,
      SurveyQuestionReport,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService, TypeOrmModule],
})
export class SurveysModule {}
