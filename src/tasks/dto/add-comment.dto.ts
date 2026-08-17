import { IsArray, IsInt, IsOptional, IsString } from "class-validator";

export class AddCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mentioned_user_ids?: number[];
}
