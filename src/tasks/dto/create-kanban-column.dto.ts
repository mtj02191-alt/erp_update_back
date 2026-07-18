import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateKanbanColumnDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}
