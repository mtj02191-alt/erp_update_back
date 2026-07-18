import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { EvidenceFileType } from "../../common/progress-tracking.enum";

export class AddEvidenceDto {
  @IsString()
  file_url: string;

  @IsEnum(EvidenceFileType)
  file_type: EvidenceFileType;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  caption?: string | null;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}
