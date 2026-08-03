import { Injectable } from "@nestjs/common";
import { Repository, Between, LessThan, Not, In } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CeoNote, CeoNoteCategory, CeoNoteStatus } from "./entities/ceo-note.entity";
import { Approval } from "./entities/approval.entity";
import { FollowUp } from "./entities/follow-up.entity";
import { Meeting } from "./entities/meeting.entity";
import { WaitingResponse } from "./entities/waiting-response.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";

export type ReportType =
  | "daily_dashboard"
  | "direct_orders"
  | "approval_records"
  | "visitor_logs"
  | "waiting_responses"
  | "project_command_sheets"
  | "meeting_notes"
  | "completed_work"
  | "unprocessed_notes";

@Injectable()
export class CeoNoteReportService {
  constructor(
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(Approval)
    private readonly approvalRepository: Repository<Approval>,
    @InjectRepository(FollowUp)
    private readonly followUpRepository: Repository<FollowUp>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(WaitingResponse)
    private readonly waitingResponseRepository: Repository<WaitingResponse>,
    @InjectRepository(ProjectCommandSheet)
    private readonly pcsRepository: Repository<ProjectCommandSheet>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(WhatsAppMessage)
    private readonly whatsappRepository: Repository<WhatsAppMessage>,
  ) {}

  async generateReport(
    type: ReportType,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    switch (type) {
      case "daily_dashboard":
        return this.getDailyDashboardReport(start, end);
      case "direct_orders":
        return this.getDirectOrdersReport(start, end);
      case "approval_records":
        return this.getApprovalRecordsReport(start, end);
      case "visitor_logs":
        return this.getVisitorLogsReport(start, end);
      case "waiting_responses":
        return this.getWaitingResponsesReport(start, end);
      case "project_command_sheets":
        return this.getProjectCommandSheetsReport(start, end);
      case "meeting_notes":
        return this.getMeetingNotesReport(start, end);
      case "completed_work":
        return this.getCompletedWorkReport(start, end);
      case "unprocessed_notes":
        return this.getUnprocessedNotesReport(start, end);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private async getDailyDashboardReport(start: Date, end: Date) {
    const totalNotes = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.created_at BETWEEN :start AND :end", { start, end })
      .getCount();

    const pendingApprovals = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.category = :category", { category: CeoNoteCategory.EMAILS_AND_APPROVALS })
      .andWhere("note.status = :status", { status: CeoNoteStatus.PENDING })
      .getCount();

    const overdueFollowUps = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.due_date < CURRENT_DATE")
      .andWhere("note.status NOT IN (:...statuses)", {
        statuses: [CeoNoteStatus.COMPLETED, CeoNoteStatus.CLOSED, CeoNoteStatus.CANCELLED, CeoNoteStatus.APPROVED],
      })
      .getCount();

    const waitingResponses = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.status = :status", { status: CeoNoteStatus.WAITING_RESPONSE })
      .getCount();

    const unprocessed = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.status = :status", { status: CeoNoteStatus.UNPROCESSED })
      .getCount();

    const todayNotes = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .where("note.created_at BETWEEN :start AND :end", { start, end })
      .orderBy("note.priority", "DESC")
      .leftJoinAndSelect("note.assigned_users", "assigned_users")
      .getMany();

    const categoryBreakdown = await this.ceoNoteRepository
      .createQueryBuilder("note")
      .select("note.category", "category")
      .addSelect("COUNT(note.id)", "count")
      .where("note.created_at BETWEEN :start AND :end", { start, end })
      .groupBy("note.category")
      .getRawMany();

    return {
      title: "Daily CEO Dashboard Report",
      date_range: { start, end },
      summary: {
        total_notes: totalNotes,
        pending_approvals: pendingApprovals,
        overdue_follow_ups: overdueFollowUps,
        waiting_responses: waitingResponses,
        unprocessed_notes: unprocessed,
      },
      category_breakdown: categoryBreakdown,
      today_notes: todayNotes.map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category,
        priority: n.priority,
        status: n.status,
        due_date: n.due_date,
        department: n.department,
      })),
    };
  }

  private async getDirectOrdersReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        category: CeoNoteCategory.CEO_DIRECT_ORDERS,
        created_at: Between(start, end),
      },
      relations: ["assigned_users", "created_by", "related_task"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Direct Orders Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        details: n.details,
        department: n.department,
        priority: n.priority,
        status: n.status,
        date: n.date,
        due_date: n.due_date,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
        related_task_id: n.related_task_id,
      })),
    };
  }

  private async getApprovalRecordsReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        category: CeoNoteCategory.EMAILS_AND_APPROVALS,
        created_at: Between(start, end),
      },
      relations: ["approval_detail", "assigned_users", "created_by"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Approval Records Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        details: n.details,
        department: n.department,
        priority: n.priority,
        status: n.status,
        date: n.date,
        due_date: n.due_date,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        approval_decision: n.approval_detail?.approval_decision || "pending",
        approval_remarks: n.approval_detail?.approval_decision_remarks,
        approval_history: n.approval_detail?.approval_history || [],
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
      })),
    };
  }

  private async getVisitorLogsReport(start: Date, end: Date) {
    const [visitors, calls, whatsapps] = await Promise.all([
      this.visitorRepository.find({
        where: { visit_datetime: Between(start, end) },
        relations: ["related_note"],
        order: { visit_datetime: "DESC" },
      }),
      this.callRepository.find({
        where: { visit_datetime: Between(start, end) },
        relations: ["related_note"],
        order: { visit_datetime: "DESC" },
      }),
      this.whatsappRepository.find({
        where: { visit_datetime: Between(start, end) },
        relations: ["related_note"],
        order: { visit_datetime: "DESC" },
      }),
    ]);

    return {
      title: "Visitor Logs Report",
      date_range: { start, end },
      total: visitors.length + calls.length + whatsapps.length,
      visitors: visitors.map((v) => ({
        id: v.id,
        name: v.visitor_name,
        organization: v.organization,
        purpose: v.purpose,
        date_time: v.visit_datetime,
        status: v.status,
        remarks: v.remarks,
      })),
      calls: calls.map((c) => ({
        id: c.id,
        name: c.caller_name,
        organization: c.organization,
        phone_number: c.phone_number,
        purpose: c.call_purpose,
        summary: c.call_summary,
        date_time: c.visit_datetime,
        status: c.status,
        follow_up_required: c.follow_up_required,
      })),
      whatsapp: whatsapps.map((w) => ({
        id: w.id,
        name: w.contact_name,
        phone_number: w.phone_number,
        message_summary: w.message_summary,
        required_action: w.required_action,
        response_status: w.response_status,
        date_time: w.visit_datetime,
        status: w.status,
      })),
    };
  }

  private async getWaitingResponsesReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        status: CeoNoteStatus.WAITING_RESPONSE,
        created_at: Between(start, end),
      },
      relations: ["waiting_response_detail", "assigned_users", "created_by"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Waiting Responses Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        details: n.details,
        department: n.department,
        priority: n.priority,
        date: n.date,
        due_date: n.due_date,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
        waiting_for: n.waiting_response_detail?.waiting_response_requested_from,
        expected_date: n.waiting_response_detail?.waiting_response_expected_date,
        reminder_date: n.waiting_response_detail?.waiting_response_last_reminder_date,
      })),
    };
  }

  private async getProjectCommandSheetsReport(start: Date, end: Date) {
    const sheets = await this.pcsRepository.find({
      where: { created_at: Between(start, end) },
      relations: ["note"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Project Command Sheets Report",
      date_range: { start, end },
      total: sheets.length,
      records: sheets.map((s) => ({
        id: s.id,
        project_name: s.project_name,
        project_details: s.project_details,
        discussions: s.discussions,
        decisions: s.decisions,
        meeting_notes: s.meeting_notes,
        pending_items: s.pending_items,
        action_items: s.action_items,
        next_steps: s.next_steps,
        results: s.results,
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        related_task_id: s.related_task_id,
      })),
    };
  }

  private async getMeetingNotesReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        category: CeoNoteCategory.MEETINGS,
        created_at: Between(start, end),
      },
      relations: ["meeting_detail", "assigned_users", "created_by"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Meeting Notes Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        details: n.details,
        department: n.department,
        priority: n.priority,
        status: n.status,
        date: n.date,
        meeting_date: n.meeting_detail?.meeting_date,
        meeting_with: n.meeting_detail?.meeting_with,
        meeting_subject: n.meeting_detail?.meeting_subject,
        discussion_points: n.meeting_detail?.meeting_discussion_points,
        decisions: n.meeting_detail?.meeting_decisions,
        action_items: n.meeting_detail?.meeting_action_items,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
      })),
    };
  }

  private async getCompletedWorkReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        status: In([CeoNoteStatus.COMPLETED, CeoNoteStatus.APPROVED, CeoNoteStatus.CLOSED]),
        updated_at: Between(start, end),
      },
      relations: ["assigned_users", "created_by", "related_task"],
      order: { updated_at: "DESC" },
    });

    return {
      title: "Completed Work Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category,
        department: n.department,
        priority: n.priority,
        status: n.status,
        date: n.date,
        completed_at: n.updated_at,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
        related_task_id: n.related_task_id,
      })),
    };
  }

  private async getUnprocessedNotesReport(start: Date, end: Date) {
    const notes = await this.ceoNoteRepository.find({
      where: {
        status: CeoNoteStatus.UNPROCESSED,
        created_at: Between(start, end),
      },
      relations: ["assigned_users", "created_by"],
      order: { created_at: "DESC" },
    });

    return {
      title: "Unprocessed Notes Report",
      date_range: { start, end },
      total: notes.length,
      records: notes.map((n) => ({
        id: n.id,
        title: n.title,
        details: n.details,
        category: n.category,
        department: n.department,
        priority: n.priority,
        date: n.date,
        due_date: n.due_date,
        created_by: n.created_by ? `${n.created_by.first_name} ${n.created_by.last_name}` : null,
        assigned_to: n.assigned_users?.map((u) => `${u.first_name} ${u.last_name}`).join(", ") || null,
      })),
    };
  }
}
