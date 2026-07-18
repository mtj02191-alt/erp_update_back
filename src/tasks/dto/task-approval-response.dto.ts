import { TaskStatus } from "../entities/task.entity";

export class TaskApprovalMetaEntryDto {
  user_id: number;
  decision: "approved" | "rejected" | "pending";
  decided_at?: Date;
}

export class TaskApprovalStateDto {
  task_id: number;
  task?: any;
  approval_required_user_ids: number[] | null;
  approvals_meta: TaskApprovalMetaEntryDto[] | null;
  approved_by_id: number[] | null;
  rejected_by_id: number[] | null;
  approval_status: TaskStatus | null;
  approved_note?:
    | {
        user_id: number;
        note: string;
        decided_at?: Date;
      }[]
    | null;
  rejected_note?:
    | {
        user_id: number;
        note: string;
        decided_at?: Date;
      }[]
    | null;
  submission_note?:
    | {
        user_id: number;
        note: string;
        created_at?: Date;
      }[]
    | null;
}
