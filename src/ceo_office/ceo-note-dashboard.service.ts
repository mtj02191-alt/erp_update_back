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
        `(note.title ILIKE :search OR note.details ILIKE :search OR note.category::text ILIKE :search)`,
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
    if (query.priority) {
      qb.andWhere("note.priority = :priority", { priority: query.priority });
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
    const sortOrder = query.sortOrder === "ASC" ? "ASC" : "DESC";

    const noteQuery = this.ceoNoteRepository.createQueryBuilder("note");
    this.applyFiltersToQuery(noteQuery, query);
    const noteCount = await noteQuery.getCount();

    const visitorCountQuery = this.visitorRepository.createQueryBuilder("visitor");
    if (query.search) {
      visitorCountQuery.andWhere(
        `(visitor.visitor_name ILIKE :visitorSearch OR visitor.purpose ILIKE :visitorSearch)`,
        { visitorSearch: `%${query.search}%` },
      );
    }
    if (query.status) {
      visitorCountQuery.andWhere("visitor.status = :visitorStatus", {
        visitorStatus: query.status,
      });
    }
    if (query.department) {
      visitorCountQuery.andWhere("visitor.department = :visitorDepartment", {
        visitorDepartment: query.department,
      });
    }
    if (query.start_date) {
      visitorCountQuery.andWhere("visitor.created_at >= :visitorStartDate", {
        visitorStartDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      visitorCountQuery.andWhere("visitor.created_at <= :visitorEndDate", {
        visitorEndDate: new Date(query.end_date),
      });
    }
    const visitorsEnabled = !query.category || query.category === CeoNoteCategory.VISITORS;
    const visitorCount = visitorsEnabled ? await visitorCountQuery.getCount() : 0;

    const callCountQuery = this.callRepository.createQueryBuilder("call");
    if (query.search) {
      callCountQuery.andWhere(
        `(call.caller_name ILIKE :callSearch OR call.call_purpose ILIKE :callSearch)`,
        { callSearch: `%${query.search}%` },
      );
    }
    if (query.status) {
      callCountQuery.andWhere("call.status = :callStatus", {
        callStatus: query.status,
      });
    }
    if (query.start_date) {
      callCountQuery.andWhere("call.created_at >= :callStartDate", {
        callStartDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      callCountQuery.andWhere("call.created_at <= :callEndDate", {
        callEndDate: new Date(query.end_date),
      });
    }
    const callsEnabled = !query.category || query.category === CeoNoteCategory.CALLS;
    const callCount = callsEnabled ? await callCountQuery.getCount() : 0;

    const whatsappCountQuery = this.whatsappRepository.createQueryBuilder("whatsapp");
    if (query.search) {
      whatsappCountQuery.andWhere(
        `(whatsapp.contact_name ILIKE :whatsappSearch OR whatsapp.message_summary ILIKE :whatsappSearch)`,
        { whatsappSearch: `%${query.search}%` },
      );
    }
    if (query.status) {
      whatsappCountQuery.andWhere("whatsapp.status = :whatsappStatus", {
        whatsappStatus: query.status,
      });
    }
    if (query.start_date) {
      whatsappCountQuery.andWhere("whatsapp.created_at >= :whatsappStartDate", {
        whatsappStartDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      whatsappCountQuery.andWhere("whatsapp.created_at <= :whatsappEndDate", {
        whatsappEndDate: new Date(query.end_date),
      });
    }
    const whatsappEnabled = !query.category || query.category === CeoNoteCategory.WHATSAPP;
    const whatsappCount = whatsappEnabled ? await whatsappCountQuery.getCount() : 0;

    const pcsCountQuery = this.projectCommandSheetRepository.createQueryBuilder("pcs");
    if (query.search) {
      pcsCountQuery.andWhere(
        `(pcs.project_name ILIKE :pcsSearch OR pcs.project_details ILIKE :pcsSearch)`,
        { pcsSearch: `%${query.search}%` },
      );
    }
    if (query.status) {
      pcsCountQuery.andWhere("pcs.status = :pcsStatus", {
        pcsStatus: query.status,
      });
    }
    if (query.start_date) {
      pcsCountQuery.andWhere("pcs.created_at >= :pcsStartDate", {
        pcsStartDate: new Date(query.start_date),
      });
    }
    if (query.end_date) {
      pcsCountQuery.andWhere("pcs.created_at <= :pcsEndDate", {
        pcsEndDate: new Date(query.end_date),
      });
    }
    const pcsEnabled = !query.category || query.category === CeoNoteCategory.PROJECT_COMMAND_SHEETS;
    const pcsCount = pcsEnabled ? await pcsCountQuery.getCount() : 0;

    const params: any[] = [];
    let paramIndex = 1;

    const buildSource = (
      baseSql: string,
      filterBuilders: Array<() => { clause: string; value: any }>,
    ) => {
      const clauses: string[] = [];
      filterBuilders.forEach((builder) => {
        const { clause, value } = builder();
        if (clause && value !== undefined) {
          const replacedClause = clause.replace(/\$n/g, () => {
            params.push(value);
            return `$${paramIndex++}`;
          });
          clauses.push(replacedClause);
        }
      });
      return `${baseSql}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}`;
    };

    const sourceQueries: string[] = [];

    sourceQueries.push(
      buildSource(
        `SELECT
          note.id,
          note.title,
          note.details,
          note.category::varchar AS category,
          note.department::varchar AS department,
          note.priority::varchar AS priority,
          note.status::varchar AS status,
          note.due_date,
          note.related_task_id,
          note.assigned_user_ids,
          note.related_person,
          note.created_at,
          NULL::int AS related_note_id,
          note.id AS note_id,
          'note' AS type,
          note.id AS record_id
        FROM ceo_notes note`,
        [
          () => ({ clause: query.search ? `(note.title ILIKE $n OR note.details ILIKE $n OR note.category::text ILIKE $n)` : "", value: query.search ? `%${query.search}%` : undefined }),
          () => ({ clause: query.category ? `note.category = $n` : "", value: query.category }),
          () => ({ clause: query.status ? `note.status = $n` : "", value: query.status }),
          () => ({ clause: query.department ? `note.department = $n` : "", value: query.department }),
          () => ({ clause: query.priority ? `note.priority = $n` : "", value: query.priority }),
          () => ({ clause: query.start_date ? `note.created_at >= $n` : "", value: query.start_date ? new Date(query.start_date) : undefined }),
          () => ({ clause: query.end_date ? `note.created_at <= $n` : "", value: query.end_date ? new Date(query.end_date) : undefined }),
          () => ({ clause: query.assigned_user_id ? `$n = ANY(note.assigned_user_ids)` : "", value: query.assigned_user_id }),
        ],
      ),
    );

    if (visitorsEnabled) {
      sourceQueries.push(
        buildSource(
          `SELECT
            visitor.id,
            visitor.visitor_name AS title,
            visitor.purpose AS details,
            '${CeoNoteCategory.VISITORS}' AS category,
            visitor.department,
            NULL::varchar AS priority,
            visitor.status,
            NULL::date AS due_date,
            visitor.related_task_id,
            NULL::text AS assigned_user_ids,
            NULL::varchar AS related_person,
            visitor.created_at,
            visitor.related_note_id,
            NULL::int AS note_id,
            'visitor' AS type,
            visitor.id AS record_id
          FROM visitors visitor`,
          [
            () => ({ clause: query.search ? `(visitor.visitor_name ILIKE $n OR visitor.purpose ILIKE $n)` : "", value: query.search ? `%${query.search}%` : undefined }),
            () => ({ clause: query.status ? `visitor.status = $n` : "", value: query.status }),
            () => ({ clause: query.department ? `visitor.department = $n` : "", value: query.department }),
            () => ({ clause: query.start_date ? `visitor.created_at >= $n` : "", value: query.start_date ? new Date(query.start_date) : undefined }),
            () => ({ clause: query.end_date ? `visitor.created_at <= $n` : "", value: query.end_date ? new Date(query.end_date) : undefined }),
          ],
        ),
      );
    }

    if (callsEnabled) {
      sourceQueries.push(
        buildSource(
          `SELECT
            call.id,
            call.caller_name AS title,
            call.call_purpose AS details,
            '${CeoNoteCategory.CALLS}' AS category,
            NULL::varchar AS department,
            NULL::varchar AS priority,
            call.status,
            NULL::date AS due_date,
            call.related_task_id,
            NULL::text AS assigned_user_ids,
            NULL::varchar AS related_person,
            call.created_at,
            call.related_note_id,
            NULL::int AS note_id,
            'call' AS type,
            call.id AS record_id
          FROM calls call`,
          [
            () => ({ clause: query.search ? `(call.caller_name ILIKE $n OR call.call_purpose ILIKE $n)` : "", value: query.search ? `%${query.search}%` : undefined }),
            () => ({ clause: query.status ? `call.status = $n` : "", value: query.status }),
            () => ({ clause: query.start_date ? `call.created_at >= $n` : "", value: query.start_date ? new Date(query.start_date) : undefined }),
            () => ({ clause: query.end_date ? `call.created_at <= $n` : "", value: query.end_date ? new Date(query.end_date) : undefined }),
          ],
        ),
      );
    }

    if (whatsappEnabled) {
      sourceQueries.push(
        buildSource(
          `SELECT
            whatsapp.id,
            whatsapp.contact_name AS title,
            whatsapp.message_summary AS details,
            '${CeoNoteCategory.WHATSAPP}' AS category,
            NULL::varchar AS department,
            NULL::varchar AS priority,
            whatsapp.status,
            NULL::date AS due_date,
            whatsapp.related_task_id,
            NULL::text AS assigned_user_ids,
            NULL::varchar AS related_person,
            whatsapp.created_at,
            whatsapp.related_note_id,
            NULL::int AS note_id,
            'whatsapp' AS type,
            whatsapp.id AS record_id
          FROM whatsapp_messages whatsapp`,
          [
            () => ({ clause: query.search ? `(whatsapp.contact_name ILIKE $n OR whatsapp.message_summary ILIKE $n)` : "", value: query.search ? `%${query.search}%` : undefined }),
            () => ({ clause: query.status ? `whatsapp.status = $n` : "", value: query.status }),
            () => ({ clause: query.start_date ? `whatsapp.created_at >= $n` : "", value: query.start_date ? new Date(query.start_date) : undefined }),
            () => ({ clause: query.end_date ? `whatsapp.created_at <= $n` : "", value: query.end_date ? new Date(query.end_date) : undefined }),
          ],
        ),
      );
    }

    if (pcsEnabled) {
      sourceQueries.push(
        buildSource(
          `SELECT
            pcs.id,
            pcs.project_name AS title,
            pcs.project_details AS details,
            '${CeoNoteCategory.PROJECT_COMMAND_SHEETS}' AS category,
            NULL::varchar AS department,
            NULL::varchar AS priority,
            pcs.status,
            pcs.end_date AS due_date,
            pcs.related_task_id,
            NULL::text AS assigned_user_ids,
            NULL::varchar AS related_person,
            pcs.created_at,
            pcs.note_id AS related_note_id,
            pcs.note_id AS note_id,
            'project_command_sheet' AS type,
            pcs.id AS record_id
          FROM project_command_sheets pcs`,
          [
            () => ({ clause: query.search ? `(pcs.project_name ILIKE $n OR pcs.project_details ILIKE $n)` : "", value: query.search ? `%${query.search}%` : undefined }),
            () => ({ clause: query.status ? `pcs.status = $n` : "", value: query.status }),
            () => ({ clause: query.start_date ? `pcs.created_at >= $n` : "", value: query.start_date ? new Date(query.start_date) : undefined }),
            () => ({ clause: query.end_date ? `pcs.created_at <= $n` : "", value: query.end_date ? new Date(query.end_date) : undefined }),
          ],
        ),
      );
    }

    const combinedSql = sourceQueries.join(" UNION ALL ");

    // Count the *display* (post-deduplication) rows, not raw UNION rows.
    //
    // Deduplication rules (mirror the frontend merge logic):
    //   - Every 'note' row counts as 1.
    //   - A child row (visitor/call/whatsapp/project_command_sheet) counts ONLY IF
    //     its parent note is NOT present anywhere in the combined UNION set.
    //     When the parent note IS in the set, the child gets merged/skipped.
    const dedupCountSql = `
      WITH combined AS (${combinedSql})
      SELECT COUNT(*)::int AS count
      FROM combined c
      WHERE c.type = 'note'
         OR (c.type = 'project_command_sheet' AND (c.note_id IS NULL OR c.note_id::int NOT IN (SELECT note_id FROM combined WHERE type = 'note' AND note_id IS NOT NULL)))
         OR (c.type IN ('visitor','call','whatsapp')     AND (c.related_note_id IS NULL OR c.related_note_id::int NOT IN (SELECT note_id FROM combined WHERE type = 'note' AND note_id IS NOT NULL)))
    `;
    const totalCountResult = await this.ceoNoteRepository.query(dedupCountSql, params);
    const total = Number(totalCountResult[0]?.count ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;
    const pagedRowsSql = `
      WITH combined AS (${combinedSql}),
           note_ids AS (
             SELECT DISTINCT note_id
             FROM combined
             WHERE type = 'note' AND note_id IS NOT NULL
           ),
           deduped AS (
             SELECT *
             FROM combined c
             WHERE c.type = 'note'
                OR (c.type = 'project_command_sheet' AND (c.note_id IS NULL OR c.note_id::int NOT IN (SELECT note_id FROM note_ids)))
                OR (c.type IN ('visitor','call','whatsapp') AND (c.related_note_id IS NULL OR c.related_note_id::int NOT IN (SELECT note_id FROM note_ids)))
           )
      SELECT * FROM deduped
      ORDER BY created_at ${sortOrder}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const rows = await this.ceoNoteRepository.query(pagedRowsSql, [...params, pageSize, offset]);

    const data = rows.map((row: any) => {
      if (typeof row.assigned_user_ids === "string") {
        row.assigned_user_ids = row.assigned_user_ids
          .split(",")
          .map((value: string) => Number(value.trim()))
          .filter((value: number) => !Number.isNaN(value));
      }
      return {
        type: row.type,
        item: row,
      };
    });

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      counts: {
        notes: noteCount,
        visitors: visitorCount,
        calls: callCount,
        whatsapp: whatsappCount,
        project_command_sheets: pcsCount,
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
