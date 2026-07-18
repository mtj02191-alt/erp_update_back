import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Survey, SurveyStatus } from "./entities/survey.entity";
import {
  SurveyQuestion,
  QuestionType,
} from "./entities/survey_question.entity";
import { SurveyQuestionOption } from "./entities/survey_question_option.entity";
import { SurveySubmission } from "./entities/survey_submission.entity";
import { SurveyAnswer } from "./entities/survey_answer.entity";
import { SurveyReport } from "./entities/survey_report.entity";
import { SurveyQuestionReport } from "./entities/survey_question_report.entity";
import { CreateSurveyDto } from "./dto/create-survey.dto";
import { UpdateSurveyDto } from "./dto/update-survey.dto";
import { AddQuestionDto, AddQuestionsBulkDto } from "./dto/add-question.dto";
import { SubmitSurveyDto } from "./dto/submit-survey.dto";

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyQuestion)
    private questionRepo: Repository<SurveyQuestion>,
    @InjectRepository(SurveyQuestionOption)
    private optionRepo: Repository<SurveyQuestionOption>,
    @InjectRepository(SurveySubmission)
    private submissionRepo: Repository<SurveySubmission>,
    @InjectRepository(SurveyAnswer)
    private answerRepo: Repository<SurveyAnswer>,
    @InjectRepository(SurveyReport)
    private reportRepo: Repository<SurveyReport>,
    @InjectRepository(SurveyQuestionReport)
    private questionReportRepo: Repository<SurveyQuestionReport>,
  ) {}

  async create(dto: CreateSurveyDto, createdBy: number): Promise<Survey> {
    const survey = this.surveyRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? SurveyStatus.DRAFT,
      start_at: dto.start_at ? new Date(dto.start_at) : null,
      end_at: dto.end_at ? new Date(dto.end_at) : null,
      created_by: createdBy != null ? ({ id: createdBy } as any) : undefined,
    });
    return this.surveyRepo.save(survey);
  }

  async findAll(): Promise<Survey[]> {
    return this.surveyRepo.find({
      order: { id: "DESC" },
      relations: ["questions"],
    });
  }

  async findOne(id: number): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({
      where: { id },
      relations: ["questions", "questions.options"],
    });
    if (!survey) throw new NotFoundException(`Survey #${id} not found`);
    return survey;
  }

  async update(id: number, dto: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.findOne(id);
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException("Only draft surveys can be updated");
    }
    if (dto.title !== undefined) survey.title = dto.title;
    if (dto.description !== undefined) survey.description = dto.description;
    if (dto.start_at !== undefined)
      survey.start_at = dto.start_at ? new Date(dto.start_at) : null;
    if (dto.end_at !== undefined)
      survey.end_at = dto.end_at ? new Date(dto.end_at) : null;
    return this.surveyRepo.save(survey);
  }

  async remove(id: number): Promise<void> {
    const survey = await this.findOne(id);
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException("Only draft surveys can be deleted");
    }
    await this.surveyRepo.remove(survey);
  }

  async addQuestions(
    surveyId: number,
    dto: AddQuestionsBulkDto,
  ): Promise<SurveyQuestion[]> {
    const survey = await this.findOne(surveyId);
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException("Can only add questions to draft surveys");
    }
    const saved: SurveyQuestion[] = [];
    for (const q of dto.questions) {
      const question = await this.addOneQuestion(surveyId, q);
      saved.push(question);
    }
    return saved;
  }

  private async addOneQuestion(
    surveyId: number,
    dto: AddQuestionDto,
  ): Promise<SurveyQuestion> {
    const question = this.questionRepo.create({
      survey_id: surveyId,
      question_text: dto.question_text,
      question_type: dto.question_type,
      is_required: dto.is_required ?? true,
      question_no: dto.question_no ?? 0,
    });
    const saved = await this.questionRepo.save(question);
    if (dto.options?.length) {
      const opts = dto.options.map((o) =>
        this.optionRepo.create({
          question_id: saved.id,
          option_key: o.option_key,
          option_text: o.option_text,
        }),
      );
      await this.optionRepo.save(opts);
    }
    return this.questionRepo.findOne({
      where: { id: saved.id },
      relations: ["options"],
    }) as Promise<SurveyQuestion>;
  }

  async activate(surveyId: number): Promise<Survey> {
    const survey = await this.findOne(surveyId);
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException("Only draft surveys can be activated");
    }
    const questions = await this.questionRepo.find({
      where: { survey_id: surveyId },
    });
    if (!questions.length) {
      throw new BadRequestException(
        "Survey must have at least one question before activation",
      );
    }
    survey.status = SurveyStatus.ACTIVE;
    return this.surveyRepo.save(survey);
  }

  async close(surveyId: number): Promise<Survey> {
    const survey = await this.findOne(surveyId);
    if (survey.status === SurveyStatus.CLOSED) {
      throw new BadRequestException("Survey is already closed");
    }
    survey.status = SurveyStatus.CLOSED;
    await this.surveyRepo.save(survey);
    await this.generateReport(surveyId);
    return this.findOne(surveyId);
  }

  async reactivate(surveyId: number): Promise<Survey> {
    const survey = await this.findOne(surveyId);
    if (survey.status !== SurveyStatus.CLOSED) {
      throw new BadRequestException("Only closed surveys can be reactivated");
    }
    survey.status = SurveyStatus.ACTIVE;
    return this.surveyRepo.save(survey);
  }

  private async generateReport(surveyId: number): Promise<SurveyReport> {
    const submissions = await this.submissionRepo.find({
      where: { survey_id: surveyId },
      relations: ["answers", "answers.question"],
    });
    const totalSubmissions = submissions.length;

    const report = this.reportRepo.create({
      survey_id: surveyId,
      total_submissions: totalSubmissions,
    });
    const savedReport = await this.reportRepo.save(report);

    const questionIds = [
      ...new Set(
        submissions.flatMap((s) => s.answers.map((a) => a.question_id)),
      ),
    ];
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds) },
      relations: ["options"],
    });

    for (const q of questions) {
      const answersForQ = submissions.flatMap((s) =>
        s.answers.filter((a) => a.question_id === q.id),
      );
      const responsesCount = answersForQ.length;

      let avgRating: number | null = null;
      let ratingCounts: Record<number, number> | null = null;
      let optionCounts: Record<string, number> | null = null;

      if (q.question_type === QuestionType.RATING_1_5) {
        const ratings = answersForQ
          .map((a) => a.answer_rating)
          .filter((r) => r != null) as number[];
        if (ratings.length) {
          avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          for (const r of ratings) {
            if (r >= 1 && r <= 5) ratingCounts[r] = (ratingCounts[r] || 0) + 1;
          }
        }
      } else if (
        q.question_type === QuestionType.MCQ_SINGLE ||
        q.question_type === QuestionType.YES_NO
      ) {
        optionCounts = {};
        for (const a of answersForQ) {
          if (a.answer_option_key) {
            optionCounts[a.answer_option_key] =
              (optionCounts[a.answer_option_key] || 0) + 1;
          }
        }
      } else if (q.question_type === QuestionType.MCQ_MULTIPLE) {
        optionCounts = {};
        for (const a of answersForQ) {
          const keys = (a as any).answer_option_keys as string[] | undefined;
          if (Array.isArray(keys)) {
            for (const k of keys) {
              if (k) optionCounts[k] = (optionCounts[k] || 0) + 1;
            }
          }
        }
      }

      const qReport = this.questionReportRepo.create({
        survey_id: surveyId,
        question_id: q.id,
        report_id: savedReport.id,
        responses_count: responsesCount,
        avg_rating: avgRating,
        rating_counts: ratingCounts,
        option_counts: optionCounts,
      });
      await this.questionReportRepo.save(qReport);
    }

    return this.reportRepo.findOne({
      where: { id: savedReport.id },
      relations: ["questionReports"],
    }) as Promise<SurveyReport>;
  }

  async getForm(surveyId: number): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: ["questions", "questions.options"],
    });
    if (!survey) throw new NotFoundException(`Survey #${surveyId} not found`);
    if (survey.status !== SurveyStatus.ACTIVE) {
      throw new ForbiddenException("Survey is not active for submission");
    }
    return survey;
  }

  async submit(
    surveyId: number,
    dto: SubmitSurveyDto,
    surveyedBy: number,
  ): Promise<SurveySubmission> {
    const survey = await this.getForm(surveyId);
    const questions = survey.questions || [];
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    for (const a of dto.answers) {
      const q = questionMap.get(a.question_id);
      if (!q)
        throw new BadRequestException(`Unknown question_id: ${a.question_id}`);
      if (
        q.question_type === QuestionType.MCQ_SINGLE ||
        q.question_type === QuestionType.YES_NO
      ) {
        if (a.answer_option_key == null || a.answer_option_key === "") {
          if (q.is_required)
            throw new BadRequestException(
              `Question ${q.id} requires answer_option_key`,
            );
        }
        const validKeys = (q.options || []).map((o) => o.option_key);
        if (a.answer_option_key && !validKeys.includes(a.answer_option_key)) {
          throw new BadRequestException(
            `Invalid option_key for question ${q.id}`,
          );
        }
      } else if (q.question_type === QuestionType.MCQ_MULTIPLE) {
        const validKeys = (q.options || []).map((o) => o.option_key);
        const keys = a.answer_option_keys ?? [];
        if (q.is_required && keys.length === 0) {
          throw new BadRequestException(
            `Question ${q.id} requires at least one option (answer_option_keys)`,
          );
        }
        for (const k of keys) {
          if (!validKeys.includes(k)) {
            throw new BadRequestException(
              `Invalid option_key in answer_option_keys for question ${q.id}`,
            );
          }
        }
      } else if (q.question_type === QuestionType.RATING_1_5) {
        if (
          q.is_required &&
          (a.answer_rating == null ||
            a.answer_rating < 1 ||
            a.answer_rating > 5)
        ) {
          throw new BadRequestException(
            `Question ${q.id} requires answer_rating 1-5`,
          );
        }
        if (
          a.answer_rating != null &&
          (a.answer_rating < 1 || a.answer_rating > 5)
        ) {
          throw new BadRequestException(
            `answer_rating must be 1-5 for question ${q.id}`,
          );
        }
      } else if (q.question_type === QuestionType.SHORT_TEXT) {
        if (
          q.is_required &&
          (a.answer_text == null || String(a.answer_text).trim() === "")
        ) {
          throw new BadRequestException(
            `Question ${q.id} requires answer_text`,
          );
        }
      }
    }

    const submission = this.submissionRepo.create({
      survey_id: surveyId,
      surveyed_by: surveyedBy,
      device_id: dto.device_id ?? null,
    });
    const savedSubmission = await this.submissionRepo.save(submission);

    const answers = dto.answers.map((a) =>
      this.answerRepo.create({
        submission_id: savedSubmission.id,
        question_id: a.question_id,
        answer_option_key: a.answer_option_key ?? null,
        answer_option_keys: a.answer_option_keys?.length
          ? a.answer_option_keys
          : null,
        answer_rating: a.answer_rating ?? null,
        answer_text: a.answer_text ?? null,
      }),
    );
    await this.answerRepo.save(answers);

    return this.submissionRepo.findOne({
      where: { id: savedSubmission.id },
      relations: ["answers"],
    }) as Promise<SurveySubmission>;
  }

  async getReport(
    surveyId: number,
  ): Promise<SurveyReport & { questionReports: SurveyQuestionReport[] }> {
    const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
    if (!survey) throw new NotFoundException(`Survey #${surveyId} not found`);

    const report = await this.reportRepo.findOne({
      where: { survey_id: surveyId },
      order: { generated_at: "DESC" },
      relations: ["questionReports", "questionReports.question"],
    });
    if (!report)
      throw new NotFoundException(
        `No report found for survey #${surveyId}. Close the survey first to generate a report.`,
      );
    return report as SurveyReport & { questionReports: SurveyQuestionReport[] };
  }
}
