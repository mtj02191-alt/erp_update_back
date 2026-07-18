import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { DreamSchoolReport } from "./entities/dream_school_report.entity";
import { DreamSchool } from "../dream_schools/entities/dream_school.entity";
import { CreateDreamSchoolReportDto } from "./dto/create-dream_school_report.dto";
import { UpdateDreamSchoolReportDto } from "./dto/update-dream_school_report.dto";

@Injectable()
export class DreamSchoolReportsService {
  constructor(
    @InjectRepository(DreamSchoolReport)
    private readonly reportRepository: Repository<DreamSchoolReport>,
    @InjectRepository(DreamSchool)
    private readonly dreamSchoolRepository: Repository<DreamSchool>,
  ) {}

  private lineToDto(r: DreamSchoolReport) {
    const s = r.dreamSchool;
    return {
      id: r.id,
      dream_school_id: r.dream_school_id,
      school_code: s?.school_code,
      student_count: s?.student_count ?? 0,
      location: s?.location,
      kawish_id: s?.kawish_id,
      visits: r.visits,
      remarks: r.remarks,
      teacher_performance: r.teacher_performance,
    };
  }

  private groupToResponse(rows: DreamSchoolReport[]) {
    if (rows.length === 0) return null;
    const sorted = [...rows].sort((a, b) => a.id - b.id);
    const first = sorted[0];
    return {
      id: first.id,
      report_month: first.report_month,
      batch_id: first.batch_id,
      lines: sorted.map((r) => this.lineToDto(r)),
    };
  }

  private async ensureSchool(id: number): Promise<DreamSchool> {
    const school = await this.dreamSchoolRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!school) throw new BadRequestException(`Dream school ${id} not found`);
    return school;
  }

  async create(dto: CreateDreamSchoolReportDto, user: any) {
    const batchId = randomUUID();
    const saved: DreamSchoolReport[] = [];
    for (const line of dto.lines) {
      await this.ensureSchool(line.dream_school_id);
      const entity = this.reportRepository.create({
        batch_id: batchId,
        report_month: dto.report_month,
        dream_school_id: line.dream_school_id,
        visits: line.visits,
        remarks: line.remarks ?? null,
        teacher_performance: line.teacher_performance,
        is_archived: false,
        created_by: user,
        updated_by: user,
      });
      saved.push(await this.reportRepository.save(entity));
    }
    const withRelations = await this.reportRepository.find({
      where: { id: In(saved.map((s) => s.id)) },
      relations: ["dreamSchool"],
      order: { id: "ASC" },
    });
    return this.groupToResponse(withRelations);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
  ) {
    const skip = (page - 1) * pageSize;

    const batchRows = await this.reportRepository
      .createQueryBuilder("r")
      .select("r.batch_id", "batch_id")
      .addSelect("MAX(r.created_at)", "mx")
      .where("r.is_archived = false")
      .groupBy("r.batch_id")
      .orderBy("mx", sortOrder === "ASC" ? "ASC" : "DESC")
      .offset(skip)
      .limit(pageSize)
      .getRawMany<{ batch_id: string }>();

    const countRow = await this.reportRepository
      .createQueryBuilder("r")
      .select("COUNT(DISTINCT r.batch_id)", "cnt")
      .where("r.is_archived = false")
      .getRawOne<{ cnt: string }>();

    const total = Number(countRow?.cnt ?? 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const batchIds = batchRows.map((b) => b.batch_id);
    if (batchIds.length === 0) {
      return {
        success: true,
        data: [],
        pagination: { page, pageSize, total, totalPages },
      };
    }

    const rows = await this.reportRepository.find({
      where: { batch_id: In(batchIds), is_archived: false },
      relations: ["dreamSchool"],
      order: { id: "ASC" },
    });

    const byBatch = new Map<string, DreamSchoolReport[]>();
    for (const r of rows) {
      if (!byBatch.has(r.batch_id)) byBatch.set(r.batch_id, []);
      byBatch.get(r.batch_id)!.push(r);
    }

    const data = batchIds.map((bid) =>
      this.groupToResponse(byBatch.get(bid) || []),
    );

    return {
      success: true,
      data,
      pagination: { page, pageSize, total, totalPages },
    };
  }

  async findOne(id: number) {
    const row = await this.reportRepository.findOne({
      where: { id, is_archived: false },
      relations: ["dreamSchool"],
    });
    if (!row)
      throw new NotFoundException(`Dream school report ${id} not found`);

    const related = await this.reportRepository.find({
      where: { batch_id: row.batch_id, is_archived: false },
      relations: ["dreamSchool"],
      order: { id: "ASC" },
    });
    return this.groupToResponse(related);
  }

  async update(id: number, dto: UpdateDreamSchoolReportDto, user: any) {
    const first = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!first)
      throw new NotFoundException(`Dream school report ${id} not found`);

    const related = await this.reportRepository.find({
      where: { batch_id: first.batch_id, is_archived: false },
      order: { id: "ASC" },
    });

    const reportMonth = dto.report_month ?? first.report_month;

    if (dto.report_month != null) {
      for (const r of related) {
        await this.reportRepository.update(r.id, {
          report_month: dto.report_month,
          updated_by: user,
        });
      }
    }

    if (dto.lines && dto.lines.length > 0) {
      for (let i = 0; i < Math.max(related.length, dto.lines.length); i++) {
        if (i < dto.lines.length) {
          const line = dto.lines[i];
          await this.ensureSchool(line.dream_school_id);
          if (i < related.length) {
            await this.reportRepository.update(related[i].id, {
              report_month: reportMonth,
              dream_school_id: line.dream_school_id,
              visits: line.visits,
              remarks: line.remarks ?? null,
              teacher_performance: line.teacher_performance,
              updated_by: user,
            });
          } else {
            await this.reportRepository.save(
              this.reportRepository.create({
                batch_id: first.batch_id,
                report_month: reportMonth,
                dream_school_id: line.dream_school_id,
                visits: line.visits,
                remarks: line.remarks ?? null,
                teacher_performance: line.teacher_performance,
                is_archived: false,
                created_by: user,
                updated_by: user,
              }),
            );
          }
        } else {
          await this.reportRepository.update(related[i].id, {
            is_archived: true,
            updated_by: user,
          });
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const row = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!row)
      throw new NotFoundException(`Dream school report ${id} not found`);
    await this.reportRepository
      .createQueryBuilder()
      .update(DreamSchoolReport)
      .set({ is_archived: true })
      .where("batch_id = :batchId", { batchId: row.batch_id })
      .andWhere("is_archived = false")
      .execute();
  }
}
