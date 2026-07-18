/**
 * Date Range Utility
 * Provides reusable date range calculation for summary queries
 * Supports: year, month, week, day, and custom date ranges
 */

export type DurationType = "year" | "month" | "week" | "day" | "custom";

// Constants for labels
export const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const DAY_NAMES_SHORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];
export const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface DateRange {
  startDate: Date;
  endDate: Date;
  durationType: DurationType;
  description: string;
}

export interface DateRangeOptions {
  duration?: DurationType;
  year?: number;
  month?: number; // 1-12
  week?: number; // 1-52
  day?: number; // 1-31
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
}

export class DateRangeUtil {
  /**
   * Calculate date range based on options
   * Default: current year if no options provided
   */
  static calculateDateRange(options: DateRangeOptions = {}): DateRange {
    const {
      duration = "year",
      year,
      month,
      week,
      day,
      start_date,
      end_date,
    } = options;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let description: string;

    switch (duration) {
      case "custom":
        if (!start_date || !end_date) {
          throw new Error(
            "start_date and end_date are required for custom duration",
          );
        }
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        // Set endDate to end of day
        endDate.setHours(23, 59, 59, 999);
        description = `Custom: ${start_date} to ${end_date}`;
        break;

      case "year":
        const targetYear = year || now.getFullYear();
        startDate = new Date(targetYear, 0, 1); // January 1
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999); // December 31
        description = `Year ${targetYear}`;
        break;

      case "month":
        const targetYearForMonth = year || now.getFullYear();
        const targetMonth = month || now.getMonth() + 1; // 1-12
        if (targetMonth < 1 || targetMonth > 12) {
          throw new Error("Month must be between 1 and 12");
        }
        startDate = new Date(targetYearForMonth, targetMonth - 1, 1); // First day of month
        // Last day of month
        endDate = new Date(targetYearForMonth, targetMonth, 0, 23, 59, 59, 999);
        description = `${this.getMonthName(targetMonth)} ${targetYearForMonth}`;
        break;

      case "week":
        const targetYearForWeek = year || now.getFullYear();
        const targetWeek = week || this.getCurrentWeek(now);
        if (targetWeek < 1 || targetWeek > 52) {
          throw new Error("Week must be between 1 and 52");
        }
        const weekDates = this.getWeekDates(targetYearForWeek, targetWeek);
        startDate = weekDates.startDate;
        endDate = weekDates.endDate;
        description = `Week ${targetWeek} of ${targetYearForWeek}`;
        break;

      case "day":
        const targetYearForDay = year || now.getFullYear();
        const targetMonthForDay = month || now.getMonth() + 1;
        const targetDay = day || now.getDate();
        startDate = new Date(
          targetYearForDay,
          targetMonthForDay - 1,
          targetDay,
          0,
          0,
          0,
          0,
        );
        endDate = new Date(
          targetYearForDay,
          targetMonthForDay - 1,
          targetDay,
          23,
          59,
          59,
          999,
        );
        description = `${targetDay}/${targetMonthForDay}/${targetYearForDay}`;
        break;

      default:
        // Default to current year
        const currentYear = now.getFullYear();
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
        description = `Current Year ${currentYear}`;
    }

    return {
      startDate,
      endDate,
      durationType: duration,
      description,
    };
  }

  /**
   * Get week dates for a given year and week number
   * Week starts on Monday (ISO 8601 week standard)
   */
  private static getWeekDates(
    year: number,
    week: number,
  ): { startDate: Date; endDate: Date } {
    // Get January 1st of the year
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate days to first Monday (if Jan 1 is not Monday)
    const daysToMonday = jan1Day === 0 ? 1 : (8 - jan1Day) % 7 || 7;

    // First Monday of the year
    const firstMonday = new Date(
      year,
      0,
      1 + (daysToMonday === 7 ? 0 : daysToMonday - 1),
    );

    // Calculate start date of the target week
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

    // End date is 6 days later (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      startDate: weekStart,
      endDate: weekEnd,
    };
  }

  /**
   * Get current week number of the year
   */
  private static getCurrentWeek(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get month name (full)
   */
  private static getMonthName(month: number): string {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "Unknown";
  }

  /**
   * Get month name by index (0-11)
   */
  static getMonthNameByIndex(index: number): string {
    return MONTH_NAMES_SHORT[index] || "Unknown";
  }

  /**
   * Generate labels for charts based on duration type
   * Returns array of labels suitable for Chart.js
   */
  static generateLabels(
    durationType: DurationType,
    startDate: Date,
    endDate: Date,
  ): string[] {
    const labels: string[] = [];

    switch (durationType) {
      case "year":
        // Months: Jan, Feb, Mar, etc.
        labels.push(...MONTH_NAMES_SHORT);
        break;

      case "month":
        // Days of the month: 1, 2, 3, ..., 31
        const daysInMonth = new Date(
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          0,
        ).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          labels.push(i.toString());
        }
        break;

      case "week":
        // Days of week: Mon, Tue, Wed, etc.
        labels.push(...DAY_NAMES_SHORT);
        break;

      case "day":
        // Hours: 00, 01, 02, ..., 23
        for (let i = 0; i < 24; i++) {
          labels.push(i.toString().padStart(2, "0"));
        }
        break;

      case "custom":
        // Calculate days difference
        const daysDiff =
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;

        // If range is less than 32 days, show days
        if (daysDiff <= 31) {
          for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
          }
        }
        // If range is less than 53 weeks, show weeks
        else if (daysDiff <= 365) {
          const weeksDiff = Math.ceil(daysDiff / 7);
          for (let i = 0; i < weeksDiff; i++) {
            labels.push(`Week ${i + 1}`);
          }
        }
        // Otherwise show months
        else {
          const start = new Date(startDate);
          const end = new Date(endDate);

          const current = new Date(start.getFullYear(), start.getMonth(), 1);
          while (current <= end) {
            labels.push(
              `${MONTH_NAMES_SHORT[current.getMonth()]} ${current.getFullYear()}`,
            );
            current.setMonth(current.getMonth() + 1);
          }
        }
        break;

      default:
        // Default to months for year
        labels.push(...MONTH_NAMES_SHORT);
    }

    return labels;
  }

  /**
   * Format date for SQL queries (PostgreSQL format)
   */
  static formatForSQL(date: Date): string {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Validate date range options
   */
  static validateOptions(options: DateRangeOptions): void {
    if (options.duration === "custom") {
      if (!options.start_date || !options.end_date) {
        throw new Error(
          "start_date and end_date are required for custom duration",
        );
      }
      const start = new Date(options.start_date);
      const end = new Date(options.end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format. Use YYYY-MM-DD");
      }
      if (start > end) {
        throw new Error("start_date must be before end_date");
      }
    }

    if (
      options.month !== undefined &&
      (options.month < 1 || options.month > 12)
    ) {
      throw new Error("Month must be between 1 and 12");
    }

    if (options.week !== undefined && (options.week < 1 || options.week > 52)) {
      throw new Error("Week must be between 1 and 52");
    }

    if (options.day !== undefined && (options.day < 1 || options.day > 31)) {
      throw new Error("Day must be between 1 and 31");
    }
  }
}
