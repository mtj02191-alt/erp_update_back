import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateDreamSchoolDto {
  /** Ignored if sent; server generates `MTJF-EDU/DS-YY-NN`. */
  @IsString()
  @IsOptional()
  school_code?: string;

  @IsInt()
  @Min(0)
  student_count: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsNotEmpty()
  kawish_id: string;
}
