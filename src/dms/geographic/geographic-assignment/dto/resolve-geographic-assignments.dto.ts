import { IsArray, IsNumber, IsOptional } from "class-validator";

export class ResolveGeographicAssignmentsDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  countries?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  regions?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  districts?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tehsils?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  cities?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  routes?: number[];
}
