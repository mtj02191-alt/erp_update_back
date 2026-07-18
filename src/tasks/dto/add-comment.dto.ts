import { IsString } from "class-validator";

export class AddCommentDto {
  @IsString()
  content: string;
}
