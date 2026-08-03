import { IsArray, ArrayNotEmpty, IsString, IsOptional, IsInt, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class BulkApproveDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  note_ids: number[];

  @IsIn(["approved", "rejected", "clarification_requested"])
  decision: "approved" | "rejected" | "clarification_requested";

  @IsString()
  @IsOptional()
  remarks?: string;
}
