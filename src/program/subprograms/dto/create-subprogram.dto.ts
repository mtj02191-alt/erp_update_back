import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateSubprogramDto {
  @IsInt()
  @Min(1)
  program_id: number;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
