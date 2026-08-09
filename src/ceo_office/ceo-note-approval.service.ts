import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { CeoNote, CeoNoteStatus } from "./entities/ceo-note.entity";
import { Approval } from "./entities/approval.entity";
import { User } from "../users/user.entity";
import { CeoNoteAuditService } from "./ceo-note-audit.service";
import { CeoNoteCategoryService } from "./ceo-note-category.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class CeoNoteApprovalService {
  constructor(
    private readonly auditService: CeoNoteAuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly categoryService: CeoNoteCategoryService,
  ) {}

  async approve(
    manager: EntityManager,
    note: CeoNote,
    payload: { decision: "approved" | "rejected" | "clarification_requested"; remarks?: string },
    currentUser: User,
  ): Promise<CeoNote> {
    const approvalRepository = manager.getRepository(Approval);
    let approval = await approvalRepository.findOne({
      where: { note_id: note.id },
    });

    if (!approval) {
      approval = approvalRepository.create({ note_id: note.id });
    }

    if (!approval.approval_history) {
      approval.approval_history = [];
    }

    const approvalEntry = {
      decision: payload.decision,
      remarks: payload.remarks || "",
      decision_date: new Date(),
      decision_by_id: currentUser?.id,
    };
    approval.approval_history.push(approvalEntry);
    await approvalRepository.save(approval);

    const oldValue = { ...note };
    note.approval_detail = approval;

    if (payload.decision === "approved") {
      note.status = CeoNoteStatus.APPROVED;
    } else if (payload.decision === "rejected") {
      note.status = CeoNoteStatus.REJECTED;
    } else if (payload.decision === "clarification_requested") {
      note.status = CeoNoteStatus.WAITING_RESPONSE;
    }

    const updatedNote = await manager.getRepository(CeoNote).save(note);
    await this.auditService.log(
      updatedNote,
      currentUser,
      "approval",
      oldValue,
      updatedNote,
      manager,
    );

    // Sync category record status and approval decision
    try {
      const mappedDecision = payload.decision === 'clarification_requested' ? 'request_clarification' : payload.decision === 'approved' ? 'approved' : payload.decision === 'rejected' ? 'rejected' : undefined;
      const updateDto: any = { status: updatedNote.status };
      if (mappedDecision) updateDto.approval_decision = mappedDecision;
      await this.categoryService.updateCategoryRecord(manager, updatedNote, updateDto);
    } catch (err) {
      // Do not fail approval if category sync fails; log via event emitter
      this.eventEmitter.emit('ceo_note.category_sync_failed', { noteId: updatedNote.id, error: err?.message || String(err) });
    }

    const userIdsToNotify = [] as number[];
    if (note.created_by_id) {
      userIdsToNotify.push(note.created_by_id);
    }
    if (note.assigned_user_ids?.length) {
      note.assigned_user_ids.forEach((id) => {
        if (!userIdsToNotify.includes(id)) {
          userIdsToNotify.push(id);
        }
      });
    }

    if (userIdsToNotify.length > 0) {
      this.eventEmitter.emit("ceo_note.approved", {
        title:
          payload.decision === "approved"
            ? `CEO Note Approved`
            : payload.decision === "rejected"
            ? `CEO Note Rejected`
            : `CEO Note Clarification Requested`,
        message: `CEO note \"${note.title}\" has been ${
          payload.decision === "approved"
            ? "approved"
            : payload.decision === "rejected"
            ? "rejected"
            : "marked as waiting for clarification"
        }.`,
        link: `/ceo-office/notes/${note.id}`,
        metadata: { noteId: note.id, decision: payload.decision },
        userIds: userIdsToNotify,
        user: currentUser,
      });
    }

    return updatedNote;
  }

  async bulkApprove(
    manager: EntityManager,
    noteIds: number[],
    payload: { decision: "approved" | "rejected" | "clarification_requested"; remarks?: string },
    currentUser: User,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const noteId of noteIds) {
      try {
        const note = await manager.getRepository(CeoNote).findOne({ where: { id: noteId } });
        if (!note) {
          failed += 1;
          continue;
        }
        await this.approve(manager, note, payload, currentUser);
        processed += 1;
      } catch {
        failed += 1;
      }
    }

    return { processed, failed };
  }
}
