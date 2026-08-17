import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { DonorPipelineStage } from "../pipeline/donor-pipeline.constants";

export class ChangePipelineStageDto {
  @IsEnum(DonorPipelineStage)
  @IsNotEmpty()
  stage: DonorPipelineStage;

  /** Why this stage change (or why they did not progress if same stage). */
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: "Reason must be at least 3 characters" })
  reason: string;

  /**
   * advanced = move to stage (default when stage differs)
   * noted = log reason without requiring a different stage
   */
  @IsOptional()
  @IsIn(["advanced", "noted"])
  transition_type?: "advanced" | "noted";

  /**
   * Required when moving to ask or pledge (advanced).
   * Optional for notes on those stages.
   */
  @ValidateIf(
    (o) =>
      (o.stage === DonorPipelineStage.ASK ||
        o.stage === DonorPipelineStage.PLEDGE) &&
      (o.transition_type || "advanced") !== "noted",
  )
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Amount must be a valid number" },
  )
  @Min(0.01, { message: "Amount is required for Ask / Pledge" })
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
