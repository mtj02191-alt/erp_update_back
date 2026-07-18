import { IsArray, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ReorderColumnDto {
  @IsNumber()
  id: number;

  @IsNumber()
  order: number;
}

export class ReorderKanbanColumnsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderColumnDto)
  columns: ReorderColumnDto[];
}
