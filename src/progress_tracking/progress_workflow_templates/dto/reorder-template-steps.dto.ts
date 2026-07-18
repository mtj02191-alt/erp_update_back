import { IsArray, IsNumber } from "class-validator";

export class ReorderTemplateStepsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  step_ids: number[];
}
