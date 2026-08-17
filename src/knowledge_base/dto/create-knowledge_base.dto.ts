import { IsOptional, IsString } from "class-validator";

export class CreateKnowledgeBaseDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  session_id?: string;
}
