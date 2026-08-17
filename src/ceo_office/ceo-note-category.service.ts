import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { CeoNote, CeoNoteCategory } from "./entities/ceo-note.entity";
import { Meeting } from "./entities/meeting.entity";
import { Approval } from "./entities/approval.entity";
import { FollowUp } from "./entities/follow-up.entity";
import { WaitingResponse } from "./entities/waiting-response.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";

@Injectable()
export class CeoNoteCategoryService {
  private hasStatusField(dto: any): boolean {
    return dto !== null && dto !== undefined && dto.status !== undefined && dto.status !== null;
  }

  private mapNoteStatusToCategoryStatus(category: string, status: string) {
    // Normalize note status (CeoNoteStatus, or frontend category-specific status)
    // into the canonical snake_case values used by each category table.
    // We compare case-insensitively and allow either enum (on_hold) or label ("On Hold") input.
    const s = (status || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
    switch (category) {
      case 'emails_and_approvals':
        if (s === 'approved' || s === 'approve') return 'approved';
        if (s === 'rejected' || s === 'reject') return 'rejected';
        if (s === 'request_clarification' || s === 'clarification') return 'request_clarification';
        return 'pending';
      case 'waiting_response':
        if (s === 'waiting_response' || s === 'waiting') return 'waiting_response';
        if (s === 'reminder_sent' || s === 'reminder') return 'reminder_sent';
        if (s === 'received') return 'received';
        if (s === 'closed') return 'closed';
        return 'waiting_response';
      case 'project_command_sheets':
        if (s === 'in_progress' || s === 'inprogress') return 'in_progress';
        if (s === 'on_hold' || s === 'onhold') return 'on_hold';
        if (s === 'completed' || s === 'complete') return 'completed';
        if (s === 'closed') return 'completed';
        return 'pending';
      case 'visitors':
        if (s === 'waiting') return 'waiting';
        if (s === 'completed' || s === 'complete') return 'completed';
        if (s === 'cancelled' || s === 'canceled' || s === 'cancel') return 'cancelled';
        if (s === 'closed') return 'completed';
        return 'pending';
      case 'calls':
        if (s === 'follow_up_required' || s === 'followup_required' || s === 'follow_up') return 'follow_up_required';
        if (s === 'completed' || s === 'complete') return 'completed';
        if (s === 'cancelled' || s === 'canceled' || s === 'cancel') return 'cancelled';
        if (s === 'closed') return 'completed';
        return 'pending';
      case 'whatsapp':
        if (s === 'pending_reply' || s === 'pendingreply') return 'pending_reply';
        if (s === 'replied' || s === 'reply') return 'replied';
        if (s === 'waiting_response' || s === 'waiting') return 'waiting_response';
        if (s === 'completed' || s === 'closed') return 'closed';
        if (s === 'cancelled' || s === 'canceled') return 'closed';
        return 'pending_reply';
      default:
        return status;
    }
  }

  async createCategoryRecord(
    manager: EntityManager,
    note: CeoNote,
    dto: any,
  ): Promise<void> {
    const category = note.category;
    if (category === CeoNoteCategory.MEETINGS) {
      const meeting = manager.getRepository(Meeting).create({
        note_id: note.id,
        meeting_date: dto.meeting_date ? new Date(dto.meeting_date) : null,
        meeting_with: dto.meeting_with || null,
        meeting_subject: dto.meeting_subject || null,
        meeting_discussion_points: dto.meeting_discussion_points || [],
        meeting_decisions: dto.meeting_decisions || [],
        meeting_action_items: dto.meeting_action_items || [],
      });
      await manager.getRepository(Meeting).save(meeting);
      note.meeting_detail = meeting;
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      const mappedApprovalDecision = this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : undefined;
      const approval = manager.getRepository(Approval).create({
        note_id: note.id,
        approval_type: dto.approval_type || null,
        approval_requested_by: dto.approval_requested_by || null,
        approval_subject: dto.approval_subject || null,
        approval_reference_number: dto.approval_reference_number || null,
        approval_amount: dto.approval_amount || null,
        approval_decision: mappedApprovalDecision ?? dto.approval_decision ?? "pending",
        approval_decision_remarks: dto.approval_decision_remarks || null,
        approval_history: dto.approval_history || null,
      });
      await manager.getRepository(Approval).save(approval);
      note.approval_detail = approval;
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      const followUp = manager.getRepository(FollowUp).create({
        note_id: note.id,
        follow_up_requested_from: dto.follow_up_requested_from || null,
        follow_up_requested_date: dto.follow_up_requested_date
          ? new Date(dto.follow_up_requested_date)
          : null,
        follow_up_last_date: dto.follow_up_last_date
          ? new Date(dto.follow_up_last_date)
          : null,
        follow_up_next_date: dto.follow_up_next_date
          ? new Date(dto.follow_up_next_date)
          : null,
        follow_up_current_response: dto.follow_up_current_response || null,
        follow_up_remarks: dto.follow_up_remarks || null,
        follow_up_history: dto.follow_up_history || [],
      });
      await manager.getRepository(FollowUp).save(followUp);
      note.follow_up_detail = followUp;
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      const mappedWaitingStatus = this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : undefined;
      const waitingResponse = manager.getRepository(WaitingResponse).create({
        note_id: note.id,
        waiting_response_requested_from:
          dto.waiting_response_requested_from || null,
        waiting_response_request_date: dto.waiting_response_request_date
          ? new Date(dto.waiting_response_request_date)
          : null,
        waiting_response_expected_date: dto.waiting_response_expected_date
          ? new Date(dto.waiting_response_expected_date)
          : null,
        waiting_response_last_reminder_date:
          dto.waiting_response_last_reminder_date
            ? new Date(dto.waiting_response_last_reminder_date)
            : null,
        waiting_response_status: mappedWaitingStatus ?? dto.waiting_response_status ??
          "waiting_response",
        waiting_response_remarks: dto.waiting_response_remarks || null,
        waiting_response_reminders: dto.waiting_response_reminders || [],
      });
      await manager.getRepository(WaitingResponse).save(waitingResponse);
      note.waiting_response_detail = waitingResponse;
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      const pcs = manager.getRepository(ProjectCommandSheet).create({
        note_id: note.id,
        project_name: dto.project_name || note.title, // Fallback to note title
        project_details: dto.project_details || null,
        discussions: dto.discussions || null,
        decisions: dto.decisions || null,
        meeting_notes: dto.meeting_notes || null,
        pending_items: dto.pending_items || null,
        action_items: dto.action_items || null,
        next_steps: dto.next_steps || null,
        results: dto.results || null,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : (dto.pcs_status ?? "pending"),
        created_by_id: note.created_by_id,
      });
      await manager.getRepository(ProjectCommandSheet).save(pcs);
      note.project_command_sheet_detail = pcs;
    } else if (category === CeoNoteCategory.VISITORS) {
      const visitor = manager.getRepository(Visitor).create({
        type: "visitor",
        visitor_name: dto.visitor_name || note.related_person || note.title,
        organization: dto.organization || null,
        purpose: dto.purpose || note.details || null,
        meeting_with: dto.visitor_meeting_with || null,
        department: dto.visitor_department || note.department || null,
        protocol_required: dto.protocol_required || null,
        expected_duration: dto.expected_duration || null,
        visitor_outcome: dto.visitor_outcome || null,
        remarks: dto.remarks || null,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : (note.date || new Date()),
        related_note_id: note.id,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : "pending",
        created_by_id: note.created_by_id,
      });
      await manager.getRepository(Visitor).save(visitor);
      note.visitor_detail = visitor;
    } else if (category === CeoNoteCategory.CALLS) {
      const call = manager.getRepository(Call).create({
        type: "call",
        caller_name: dto.caller_name || note.related_person || note.title,
        organization: dto.organization || null,
        phone_number: dto.phone_number || null,
        call_purpose: dto.call_purpose || note.details || null,
        call_summary: dto.call_summary || null,
        follow_up_required: dto.follow_up_required || "No",
        follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null,
        assigned_to: dto.assigned_to || null,
        remarks: dto.remarks || null,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : (note.date || new Date()),
        related_note_id: note.id,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : "pending",
        created_by_id: note.created_by_id,
      });
      await manager.getRepository(Call).save(call);
      note.call_detail = call;
    } else if (category === CeoNoteCategory.WHATSAPP) {
      const whatsapp = manager.getRepository(WhatsAppMessage).create({
        type: "whatsapp",
        contact_name: dto.contact_name || note.related_person || note.title,
        phone_number: dto.phone_number || null,
        message_summary: dto.message_summary || note.details || null,
        required_action: dto.required_action || null,
        attachment_url: dto.attachment_url || null,
        response_status: dto.response_status || null,
        remarks: dto.remarks || null,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : (note.date || new Date()),
        related_note_id: note.id,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : "pending_reply",
        created_by_id: note.created_by_id,
      });
      await manager.getRepository(WhatsAppMessage).save(whatsapp);
      note.whatsapp_detail = whatsapp;
    }
  }

  async updateCategoryRecord(
    manager: EntityManager,
    note: CeoNote,
    dto: any,
  ): Promise<void> {
    const category = note.category;
    if (category === CeoNoteCategory.MEETINGS) {
      let meeting = await manager.getRepository(Meeting).findOne({
        where: { note_id: note.id },
      });
      if (!meeting) {
        meeting = manager.getRepository(Meeting).create({ note_id: note.id });
      }
      Object.assign(meeting, {
        meeting_date: dto.meeting_date
          ? new Date(dto.meeting_date)
          : meeting.meeting_date,
        meeting_with: dto.meeting_with || meeting.meeting_with,
        meeting_subject: dto.meeting_subject || meeting.meeting_subject,
        meeting_discussion_points:
          dto.meeting_discussion_points || meeting.meeting_discussion_points,
        meeting_decisions: dto.meeting_decisions || meeting.meeting_decisions,
        meeting_action_items:
          (dto.meeting_action_items || meeting.meeting_action_items).map((item) => ({
            ...item,
            status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : (item.status ?? 'pending'),
          })),
      });
      await manager.getRepository(Meeting).save(meeting);
      note.meeting_detail = meeting;
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      let approval = await manager.getRepository(Approval).findOne({
        where: { note_id: note.id },
      });
      if (!approval) {
        approval = manager.getRepository(Approval).create({ note_id: note.id });
      }
      Object.assign(approval, {
        approval_type: dto.approval_type || approval.approval_type,
        approval_requested_by:
          dto.approval_requested_by || approval.approval_requested_by,
        approval_subject: dto.approval_subject || approval.approval_subject,
        approval_reference_number:
          dto.approval_reference_number || approval.approval_reference_number,
        approval_amount: dto.approval_amount ?? approval.approval_amount,
        approval_decision: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : (dto.approval_decision ?? approval.approval_decision),
        approval_decision_remarks:
          dto.approval_decision_remarks || approval.approval_decision_remarks,
        approval_history: dto.approval_history || approval.approval_history,
      });
      await manager.getRepository(Approval).save(approval);
      note.approval_detail = approval;
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      let followUp = await manager.getRepository(FollowUp).findOne({
        where: { note_id: note.id },
      });
      if (!followUp) {
        followUp = manager.getRepository(FollowUp).create({ note_id: note.id });
      }
      Object.assign(followUp, {
        follow_up_requested_from:
          dto.follow_up_requested_from || followUp.follow_up_requested_from,
        follow_up_requested_date: dto.follow_up_requested_date
          ? new Date(dto.follow_up_requested_date)
          : followUp.follow_up_requested_date,
        follow_up_last_date: dto.follow_up_last_date
          ? new Date(dto.follow_up_last_date)
          : followUp.follow_up_last_date,
        follow_up_next_date: dto.follow_up_next_date
          ? new Date(dto.follow_up_next_date)
          : followUp.follow_up_next_date,
        follow_up_current_response:
          dto.follow_up_current_response || followUp.follow_up_current_response,
        follow_up_remarks: dto.follow_up_remarks || followUp.follow_up_remarks,
        follow_up_history: dto.follow_up_history || followUp.follow_up_history,
      });
      await manager.getRepository(FollowUp).save(followUp);
      note.follow_up_detail = followUp;
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      let waitingResponse = await manager.getRepository(WaitingResponse).findOne({
        where: { note_id: note.id },
      });
      if (!waitingResponse) {
        waitingResponse = manager
          .getRepository(WaitingResponse)
          .create({ note_id: note.id });
      }
      Object.assign(waitingResponse, {
        waiting_response_requested_from:
          dto.waiting_response_requested_from ||
          waitingResponse.waiting_response_requested_from,
        waiting_response_request_date: dto.waiting_response_request_date
          ? new Date(dto.waiting_response_request_date)
          : waitingResponse.waiting_response_request_date,
        waiting_response_expected_date: dto.waiting_response_expected_date
          ? new Date(dto.waiting_response_expected_date)
          : waitingResponse.waiting_response_expected_date,
        waiting_response_last_reminder_date:
          dto.waiting_response_last_reminder_date
            ? new Date(dto.waiting_response_last_reminder_date)
            : waitingResponse.waiting_response_last_reminder_date,
        waiting_response_status:
          this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : (dto.waiting_response_status ?? waitingResponse.waiting_response_status),
        waiting_response_remarks:
          dto.waiting_response_remarks || waitingResponse.waiting_response_remarks,
        waiting_response_reminders:
          dto.waiting_response_reminders || waitingResponse.waiting_response_reminders,
      });
      await manager.getRepository(WaitingResponse).save(waitingResponse);
      note.waiting_response_detail = waitingResponse;
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      let pcs = await manager.getRepository(ProjectCommandSheet).findOne({
        where: { note_id: note.id },
      });
      if (!pcs) {
        pcs = manager.getRepository(ProjectCommandSheet).create({ note_id: note.id });
      }
      Object.assign(pcs, {
        project_name: dto.project_name || pcs.project_name,
        project_details: dto.project_details || pcs.project_details,
        discussions: dto.discussions || pcs.discussions,
        decisions: dto.decisions || pcs.decisions,
        meeting_notes: dto.meeting_notes || pcs.meeting_notes,
        pending_items: dto.pending_items || pcs.pending_items,
        action_items: dto.action_items || pcs.action_items,
        next_steps: dto.next_steps || pcs.next_steps,
        results: dto.results || pcs.results,
        start_date: dto.start_date ? new Date(dto.start_date) : pcs.start_date,
        end_date: dto.end_date ? new Date(dto.end_date) : pcs.end_date,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : (dto.pcs_status ?? pcs.status),
      });
      await manager.getRepository(ProjectCommandSheet).save(pcs);
      note.project_command_sheet_detail = pcs;
    } else if (category === CeoNoteCategory.VISITORS) {
      let visitor = await manager.getRepository(Visitor).findOne({
        where: { related_note_id: note.id },
      });
      if (!visitor) {
        visitor = manager.getRepository(Visitor).create({ related_note_id: note.id });
      }
      Object.assign(visitor, {
        visitor_name: dto.visitor_name || note.related_person || visitor.visitor_name,
        organization: dto.organization || visitor.organization,
        purpose: dto.purpose || visitor.purpose,
        meeting_with: dto.meeting_with || dto.visitor_meeting_with || visitor.meeting_with,
        department: dto.department || dto.visitor_department || visitor.department,
        protocol_required: dto.protocol_required || visitor.protocol_required,
        expected_duration: dto.expected_duration || visitor.expected_duration,
        visitor_outcome: dto.visitor_outcome || visitor.visitor_outcome,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : visitor.visit_datetime,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : visitor.status,
      });
      await manager.getRepository(Visitor).save(visitor);
      note.visitor_detail = visitor;
    } else if (category === CeoNoteCategory.CALLS) {
      let call = await manager.getRepository(Call).findOne({
        where: { related_note_id: note.id },
      });
      if (!call) {
        call = manager.getRepository(Call).create({ related_note_id: note.id });
      }
      Object.assign(call, {
        caller_name: dto.caller_name || call.caller_name,
        organization: dto.organization || call.organization,
        phone_number: dto.phone_number || call.phone_number,
        call_purpose: dto.call_purpose || call.call_purpose,
        call_summary: dto.call_summary || call.call_summary,
        follow_up_required: dto.follow_up_required || call.follow_up_required,
        follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : call.follow_up_date,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : call.visit_datetime,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : call.status,
      });
      await manager.getRepository(Call).save(call);
      note.call_detail = call;
    } else if (category === CeoNoteCategory.WHATSAPP) {
      let whatsapp = await manager.getRepository(WhatsAppMessage).findOne({
        where: { related_note_id: note.id },
      });
      if (!whatsapp) {
        whatsapp = manager
          .getRepository(WhatsAppMessage)
          .create({ related_note_id: note.id });
      }
      Object.assign(whatsapp, {
        contact_name: dto.contact_name || whatsapp.contact_name,
        phone_number: dto.phone_number || whatsapp.phone_number,
        message_summary: dto.message_summary || whatsapp.message_summary,
        required_action: dto.required_action || whatsapp.required_action,
        attachment_url: dto.attachment_url || whatsapp.attachment_url,
        response_status: dto.response_status || whatsapp.response_status,
        visit_datetime: dto.visit_datetime ? new Date(dto.visit_datetime) : whatsapp.visit_datetime,
        status: this.hasStatusField(dto) ? this.mapNoteStatusToCategoryStatus(category, dto.status) : whatsapp.status,
      });
      await manager.getRepository(WhatsAppMessage).save(whatsapp);
      note.whatsapp_detail = whatsapp;
    }
  }

  async deleteCategoryRecord(manager: EntityManager, note: CeoNote): Promise<void> {
    const category = note.category;
    if (category === CeoNoteCategory.MEETINGS) {
      await manager.getRepository(Meeting).delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      await manager.getRepository(Approval).delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      await manager.getRepository(FollowUp).delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      await manager.getRepository(WaitingResponse).delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      await manager.getRepository(ProjectCommandSheet).delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.VISITORS) {
      await manager
        .getRepository(Visitor)
        .delete({ related_note_id: note.id });
    } else if (category === CeoNoteCategory.CALLS) {
      await manager.getRepository(Call).delete({ related_note_id: note.id });
    } else if (category === CeoNoteCategory.WHATSAPP) {
      await manager
        .getRepository(WhatsAppMessage)
        .delete({ related_note_id: note.id });
    }
  }
}
