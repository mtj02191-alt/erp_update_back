import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateWorkflowBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tag_number?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tag_name?: string | null;
}
