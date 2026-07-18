import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsArray,
} from "class-validator";
import { CeoNoteCategory, CeoNoteStatus } from "../entities/ceo-note.entity";
import { Department } from "../../users/user.entity";

export class CreateCeoNoteDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsEnum(CeoNoteCategory)
  @IsOptional()
  category?: CeoNoteCategory;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  related_person?: string;

  @IsEnum(Department)
  @IsOptional()
  department?: Department;

  @IsEnum(["low", "medium", "high", "critical"])
  @IsOptional()
  priority?: "low" | "medium" | "high" | "critical";

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsEnum(CeoNoteStatus)
  @IsOptional()
  status?: CeoNoteStatus;

  @IsString()
  @IsOptional()
  attachment?: string;

  @IsString()
  @IsOptional()
  voice_note?: string;

  @IsString()
  @IsOptional()
  pa_remarks?: string;

  @IsString()
  @IsOptional()
  ceo_remarks?: string;



  @IsInt()
  @IsOptional()
  related_task_id?: number;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  assigned_user_ids?: number[];

  // ==================== FOLLOW-UP CATEGORY FIELDS ====================
  @IsString()
  @IsOptional()
  follow_up_requested_from?: string;

  @IsDateString()
  @IsOptional()
  follow_up_requested_date?: string;

  @IsDateString()
  @IsOptional()
  follow_up_last_date?: string;

  @IsDateString()
  @IsOptional()
  follow_up_next_date?: string;

  @IsString()
  @IsOptional()
  follow_up_current_response?: string;

  @IsString()
  @IsOptional()
  follow_up_remarks?: string;

  @IsArray()
  @IsOptional()
  follow_up_history?: any[];

  // ==================== MEETING CATEGORY FIELDS ====================
  @IsDateString()
  @IsOptional()
  meeting_date?: string;

  @IsString()
  @IsOptional()
  meeting_with?: string;

  @IsString()
  @IsOptional()
  meeting_subject?: string;

  @IsArray()
  @IsOptional()
  meeting_discussion_points?: any[];

  @IsArray()
  @IsOptional()
  meeting_decisions?: any[];

  @IsArray()
  @IsOptional()
  meeting_action_items?: any[];

  // ==================== EMAILS & APPROVALS CATEGORY FIELDS ====================
  @IsString()
  @IsOptional()
  approval_type?: string;

  @IsString()
  @IsOptional()
  approval_requested_by?: string;

  @IsString()
  @IsOptional()
  approval_subject?: string;

  @IsString()
  @IsOptional()
  approval_reference_number?: string;

  @IsNumber()
  @IsOptional()
  approval_amount?: number;

  @IsEnum(["pending", "approved", "rejected", "request_clarification"])
  @IsOptional()
  approval_decision?:
    | "pending"
    | "approved"
    | "rejected"
    | "request_clarification";

  @IsString()
  @IsOptional()
  approval_decision_remarks?: string;

  // ==================== WAITING RESPONSE CATEGORY FIELDS ====================
  @IsString()
  @IsOptional()
  waiting_response_requested_from?: string;

  @IsDateString()
  @IsOptional()
  waiting_response_request_date?: string;

  @IsDateString()
  @IsOptional()
  waiting_response_expected_date?: string;

  @IsDateString()
  @IsOptional()
  waiting_response_last_reminder_date?: string;

  @IsEnum(["waiting_response", "reminder_sent", "received", "closed"])
  @IsOptional()
  waiting_response_status?:
    | "waiting_response"
    | "reminder_sent"
    | "received"
    | "closed";

  @IsString()
  @IsOptional()
  waiting_response_remarks?: string;

  @IsArray()
  @IsOptional()
  waiting_response_reminders?: any[];
}
