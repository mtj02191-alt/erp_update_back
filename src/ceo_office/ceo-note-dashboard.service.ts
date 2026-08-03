import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CeoNote, CeoNoteCategory } from "./entities/ceo-note.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { CeoNotesQueryDto } from "./dto/ceo-notes-query.dto";

@Injectable()
export class CeoNoteDashboardService {
  constructor(
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(ProjectCommandSheet)
    private readonly projectCommandSheetRepository: Repository<ProjectCommandSheet>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(WhatsAppMessage)
    private readonly whatsappRepository: Repository<WhatsAppMessage>,
  ) {}

  private applyFiltersToQuery(qb: any, query: CeoNotesQueryDto) {
    if (query.search) {
      qb.andWhere(
        `(note.title ILIKE :search OR note.details ILIKE :search OR note.category ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }
    if (query.category) {
      qb.andWhere("note.category = :category", { category: query.category });
    }
    if (query.status) {
      qb.andWhere("note.status = :status", { status: query.status });
    }
    if (query.department) {
      qb.andWhere("note.department = :department", { department: query.department });
    }
    if (query.assigned_user_id) {
      qb.andWhere(
        `:assignedUserId = ANY(note.assigned_user_ids)`,
        { assignedUserId: query.assigned_user_id },
      );
    }
    if (query.start_date) {
      qb.andWhere("note.created_at >= :startDate", {
        startDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      qb.andWhere("note.created_at <= :endDate", {
        endDate: new Date(query.end_date),
      });
    }
  }

  async getInstructionRegister(query: CeoNotesQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    const noteQuery = this.ceoNoteRepository.createQueryBuilder("note");
    this.applyFiltersToQuery(noteQuery, query);
    noteQuery.orderBy("note.created_at", query.sortOrder || "DESC");
    noteQuery.take(pageSize);
    noteQuery.skip((page - 1) * pageSize);
    const [notes, totalNotes] = await noteQuery.getManyAndCount();

    const visitorQuery = this.visitorRepository.createQueryBuilder("visitor");
    const callQuery = this.callRepository.createQueryBuilder("call");
    const whatsappQuery = this.whatsappRepository.createQueryBuilder("whatsapp");
    const pcsQuery = this.projectCommandSheetRepository.createQueryBuilder("pcs");

    if (!query.category || query.category === CeoNoteCategory.VISITORS) {
      visitorQuery.orderBy("visitor.created_at", query.sortOrder || "DESC");
      visitorQuery.take(pageSize);
    }
    if (!query.category || query.category === CeoNoteCategory.CALLS) {
      callQuery.orderBy("call.created_at", query.sortOrder || "DESC");
      callQuery.take(pageSize);
    }
    if (!query.category || query.category === CeoNoteCategory.WHATSAPP) {
      whatsappQuery.orderBy("whatsapp.created_at", query.sortOrder || "DESC");
      whatsappQuery.take(pageSize);
    }
    if (!query.category || query.category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      pcsQuery.orderBy("pcs.created_at", query.sortOrder || "DESC");
      pcsQuery.take(pageSize);
    }

    const [visitors, calls, whatsappMessages, projectCommandSheets] = await Promise.all([
      visitorQuery.getMany(),
      callQuery.getMany(),
      whatsappQuery.getMany(),
      pcsQuery.getMany(),
    ]);

    const combinedRecords = [
      ...notes.map((item) => ({ type: "note", item })),
      ...visitors.map((item) => ({ type: "visitor", item })),
      ...calls.map((item) => ({ type: "call", item })),
      ...whatsappMessages.map((item) => ({ type: "whatsapp", item })),
      ...projectCommandSheets.map((item) => ({ type: "project_command_sheet", item })),
    ];

    const getRecordDate = (record: any): number => {
      const dateValue =
        record.created_at ||
        record.visit_datetime ||
        record.start_date ||
        record.date ||
        record.createdAt ||
        new Date();
      return new Date(dateValue).getTime();
    };

    combinedRecords.sort((a, b) => {
      const aDate = getRecordDate(a.item);
      const bDate = getRecordDate(b.item);
      return query.sortOrder === "ASC" ? aDate - bDate : bDate - aDate;
    });

    const totalCombined = totalNotes + visitors.length + calls.length + whatsappMessages.length + projectCommandSheets.length;

    return {
      data: combinedRecords.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        total: totalCombined,
      },
      counts: {
        notes: totalNotes,
        visitors: visitors.length,
        calls: calls.length,
        whatsapp: whatsappMessages.length,
        project_command_sheets: projectCommandSheets.length,
      },
    };
  }

  async getSummary(query: CeoNotesQueryDto) {
    const summaryQuery = this.ceoNoteRepository.createQueryBuilder("note");
    this.applyFiltersToQuery(summaryQuery, query);

    const totalNotes = await summaryQuery.getCount();

    const categoryCounts = await summaryQuery
      .clone()
      .select("note.category", "category")
      .addSelect("COUNT(*)", "count")
      .groupBy("note.category")
      .getRawMany();

    const statusCounts = await summaryQuery
      .clone()
      .select("note.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("note.status")
      .getRawMany();

    const recentNotes = await summaryQuery
      .clone()
      .orderBy("note.created_at", "DESC")
      .take(5)
      .getMany();

    return {
      totalNotes,
      categoryCounts,
      statusCounts,
      recentNotes,
    };
  }
}
