import { IsString, IsOptional, IsNumber } from "class-validator";

export class UpdateKanbanColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}
