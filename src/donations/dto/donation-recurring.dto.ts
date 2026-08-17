import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

/** Stripe subscription billing interval (Checkout + Elements). */
export enum DonationRecurringInterval {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

/** When the first / subsequent billing cycle should start. */
export enum DonationRecurringStartDateMode {
  SAME_DATE = "same_date",
  FIRST_OF_MONTH = "first_of_month",
  /** Pick day 1–31; repeats on that day each month */
  DAY_OF_MONTH = "day_of_month",
  CUSTOM = "custom",
}

export class DonationRecurringDto {
  @IsEnum(DonationRecurringInterval, {
    message: "recurring.interval must be one of: day, week, month, year",
  })
  interval: DonationRecurringInterval;

  @IsOptional()
  @IsInt()
  @Min(1)
  interval_count?: number;

  @IsOptional()
  @IsEnum(DonationRecurringStartDateMode, {
    message:
      "recurring.start_date_mode must be one of: same_date, first_of_month, day_of_month, custom",
  })
  start_date_mode?: DonationRecurringStartDateMode;

  /** YYYY-MM-DD or day-of-month anchor when start_date_mode is day_of_month / custom */
  @IsOptional()
  @IsDateString()
  start_date?: string;

  /** Day of month (1–31) when start_date_mode is day_of_month */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day_of_month?: number;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;
}
