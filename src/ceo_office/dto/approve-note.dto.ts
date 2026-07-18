import { IsEnum, IsString, IsOptional } from "class-validator";

export class ApproveNoteDto {
  @IsEnum(["approved", "rejected", "clarification_requested"])
  decision: "approved" | "rejected" | "clarification_requested";

  @IsString()
  @IsOptional()
  remarks?: string;
}
