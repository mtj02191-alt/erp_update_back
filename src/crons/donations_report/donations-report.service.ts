import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Donation } from "../../donations/entities/donation.entity";
import { EmailService } from "../../email/email.service";

export interface DonationReportData {
  period: {
    type: "daily" | "weekly" | "monthly";
    startDate: Date;
    endDate: Date;
    label: string;
  };
  summary: {
    totalReceived: {
      count: number;
      amount: number;
      byType: {
        zakat: { count: number; amount: number };
        sadqa: { count: number; amount: number };
        general: { count: number; amount: number };
      };
    };
    totalPending: {
      count: number;
      amount: number;
      byType: {
        zakat: { count: number; amount: number };
        sadqa: { count: number; amount: number };
        general: { count: number; amount: number };
      };
    };
    totalFailed: {
      count: number;
      amount: number;
      byType: {
        zakat: { count: number; amount: number };
        sadqa: { count: number; amount: number };
        general: { count: number; amount: number };
      };
    };
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    received: { count: number; amount: number };
    pending: { count: number; amount: number };
    failed: { count: number; amount: number };
    byType: {
      zakat: { count: number; amount: number };
      sadqa: { count: number; amount: number };
      general: { count: number; amount: number };
    };
  }>;
}

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  type: "daily" | "weekly" | "monthly";
  label: string;
}

@Injectable()
export class DonationsReportService {
  private readonly logger = new Logger(DonationsReportService.name);

  // Project mapping - IDs stored in project_name column
  private readonly PROJECTS = [
    { id: "health", title: "Health" },
    { id: "education", title: "Education" },
    { id: "clean-water", title: "Clean Water" },
    { id: "apna-ghar", title: "Apna Ghar" },
    { id: "disaster-management", title: "Disaster Relief" },
    { id: "kasb-skill-development", title: "KASB Skill Development" },
    { id: "seeds-of-change", title: "Seeds of Change" },
    { id: "qurbani-barai-mustehqeen", title: "Qurbani Barai Mustehqeen" },
    { id: "aas-lab-diagnostics", title: "AAS Lab & Diagnostics" },
    { id: "community-services", title: "Community Services" },
  ];

  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Get default email recipients from environment variable or fallback to single default
   * Supports:
   * 1. Comma-separated emails: DONATIONS_REPORT_DEFAULT_EMAILS="dev@mtjfoundation.org,irfan.waheed@mtjfoundation.org"
   * 2. JSON array string: DONATIONS_REPORT_DEFAULT_EMAILS='["dev@mtjfoundation.org", "irfan.waheed@mtjfoundation.org"]'
   * 3. Array-like string: DONATIONS_REPORT_DEFAULT_EMAILS="['dev@mtjfoundation.org', 'irfan.waheed@mtjfoundation.org']"
   */
  private getDefaultEmails(): string[] {
    const envEmails = this.configService.get<string>(
      "DONATIONS_REPORT_DEFAULT_EMAILS",
      "",
    );

    if (!envEmails || !envEmails.trim()) {
      return ["dev@mtjfoundation.org"];
    }

    const trimmed = envEmails.trim();
    let emails: string[] = [];

    // Try to parse as JSON array first (handles both ["email"] and ['email'] formats)
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        // Replace single quotes with double quotes for JSON parsing
        const jsonString = trimmed.replace(/'/g, '"');
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          emails = parsed.filter((email) => email && typeof email === "string");
        }
      } catch (error) {
        // If JSON parsing fails, fall through to comma-separated parsing
        this.logger.warn(
          `Failed to parse DONATIONS_REPORT_DEFAULT_EMAILS as JSON, trying comma-separated format`,
        );
      }
    }

    // If JSON parsing didn't work or didn't produce valid emails, try comma-separated
    if (emails.length === 0) {
      emails = trimmed
        .split(",")
        .map((email) => email.trim())
        .map((email) => {
          // Remove brackets and quotes if present
          return email.replace(/^['"\[\]]+|['"\[\]]+$/g, "");
        })
        .filter((email) => email && email.includes("@"));
    }

    // Filter and validate emails
    const validEmails = emails
      .map((email) => email.trim())
      .filter((email) => {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && emailRegex.test(email);
      });

    if (validEmails.length > 0) {
      this.logger.log(
        `Loaded ${validEmails.length} default email(s) from environment: ${validEmails.join(", ")}`,
      );
      return validEmails;
    }

    // Fallback to single default email
    this.logger.warn(
      "No valid emails found in DONATIONS_REPORT_DEFAULT_EMAILS, using default",
    );
    return ["dev@mtjfoundation.org"];
  }

  /**
   * Generate daily report for previous day
   * When cron runs at 1 AM, it reports the previous day
   */
  async generateDailyReport(): Promise<DonationReportData> {
    // Get yesterday's date (previous day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // End of yesterday (23:59:59.999)
    const endDate = new Date(yesterday);
    endDate.setHours(23, 59, 59, 999);

    const period: ReportPeriod = {
      startDate: yesterday,
      endDate: endDate,
      type: "daily",
      label: `Daily Report - ${yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    };

    return this.generateReport(period);
  }

  /**
   * Generate weekly report for previous week (Monday to Sunday)
   * When cron runs on Monday 9 AM, it reports the previous week
   */
  async generateWeeklyReport(): Promise<DonationReportData> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate previous week's Monday
    // If today is Monday, previous Monday is 7 days ago
    // If today is Tuesday, previous Monday is 1 day ago
    // If today is Sunday, previous Monday is 6 days ago
    let daysToPreviousMonday: number;
    if (dayOfWeek === 0) {
      // Sunday: previous Monday is 6 days ago
      daysToPreviousMonday = 6;
    } else if (dayOfWeek === 1) {
      // Monday: previous Monday is 7 days ago
      daysToPreviousMonday = 7;
    } else {
      // Tuesday-Saturday: previous Monday is (dayOfWeek - 1) days ago
      daysToPreviousMonday = dayOfWeek - 1;
    }

    const previousMonday = new Date(today);
    previousMonday.setDate(today.getDate() - daysToPreviousMonday);
    previousMonday.setHours(0, 0, 0, 0);

    // Calculate previous week's Sunday (end of previous week)
    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);
    previousSunday.setHours(23, 59, 59, 999);

    const period: ReportPeriod = {
      startDate: previousMonday,
      endDate: previousSunday,
      type: "weekly",
      label: `Weekly Report - ${previousMonday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} to ${previousSunday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    };

    return this.generateReport(period);
  }

  /**
   * Generate monthly report for previous month
   */
  async generateMonthlyReport(): Promise<DonationReportData> {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth);
    lastDayOfPreviousMonth.setDate(0); // Get last day of previous month
    lastDayOfPreviousMonth.setHours(23, 59, 59, 999);

    const firstDayOfPreviousMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    firstDayOfPreviousMonth.setHours(0, 0, 0, 0);

    const period: ReportPeriod = {
      startDate: firstDayOfPreviousMonth,
      endDate: lastDayOfPreviousMonth,
      type: "monthly",
      label: `Monthly Report - ${firstDayOfPreviousMonth.toLocaleDateString(
        "en-US",
        {
          month: "long",
          year: "numeric",
        },
      )}`,
    };

    return this.generateReport(period);
  }

  /**
   * Generate report for custom date range
   */
  async generateCustomReport(
    startDate: Date,
    endDate: Date,
    type: "daily" | "weekly" | "monthly" = "daily",
  ): Promise<DonationReportData> {
    const period: ReportPeriod = {
      startDate,
      endDate,
      type,
      label: `Custom Report - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    };

    return this.generateReport(period);
  }

  /**
   * Core method to generate report data
   */
  private async generateReport(
    period: ReportPeriod,
  ): Promise<DonationReportData> {
    try {
      this.logger.log(`Generating ${period.type} report for ${period.label}`);

      // Format dates for SQL query (YYYY-MM-DD)
      // Use date-only format for PostgreSQL DATE column comparison
      // Convert to local date string to avoid timezone issues
      const formatDateForQuery = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDateForQuery(period.startDate);
      const endDateStr = formatDateForQuery(period.endDate);

      // Base query builder - using date column (DATE type) for filtering
      const baseQuery = this.donationRepository
        .createQueryBuilder("donation")
        .where("donation.date >= :startDate", { startDate: startDateStr })
        .andWhere("donation.date <= :endDate", { endDate: endDateStr });

      // Get all donations in period
      const allDonations = await baseQuery.getMany();

      // Initialize summary
      const summary = {
        totalReceived: {
          count: 0,
          amount: 0,
          byType: {
            zakat: { count: 0, amount: 0 },
            sadqa: { count: 0, amount: 0 },
            general: { count: 0, amount: 0 },
          },
        },
        totalPending: {
          count: 0,
          amount: 0,
          byType: {
            zakat: { count: 0, amount: 0 },
            sadqa: { count: 0, amount: 0 },
            general: { count: 0, amount: 0 },
          },
        },
        totalFailed: {
          count: 0,
          amount: 0,
          byType: {
            zakat: { count: 0, amount: 0 },
            sadqa: { count: 0, amount: 0 },
            general: { count: 0, amount: 0 },
          },
        },
      };

      // Initialize project data
      const projectData = new Map<string, any>();

      // Process each donation
      for (const donation of allDonations) {
        // Handle null/undefined amounts properly (0 is a valid amount)
        const amount = donation.amount ?? 0;
        // Handle status with proper null checking
        const status = (donation.status || "pending").toLowerCase();
        const donationType = this.getDonationType(donation.donation_type);
        // Priority: project_name (contains ID) > project_id > 'other'
        // User specified that IDs are stored in project_name column
        const projectId =
          donation.project_name || donation.project_id || "other";
        const projectName = this.getProjectName(projectId);

        // Initialize project if not exists
        if (!projectData.has(projectId)) {
          projectData.set(projectId, {
            projectId,
            projectName,
            received: { count: 0, amount: 0 },
            pending: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            byType: {
              zakat: { count: 0, amount: 0 },
              sadqa: { count: 0, amount: 0 },
              general: { count: 0, amount: 0 },
            },
          });
        }

        const project = projectData.get(projectId);

        // Update summary and project data based on status
        if (status === "completed") {
          summary.totalReceived.count++;
          summary.totalReceived.amount += amount;
          summary.totalReceived.byType[donationType].count++;
          summary.totalReceived.byType[donationType].amount += amount;

          project.received.count++;
          project.received.amount += amount;
          project.byType[donationType].count++;
          project.byType[donationType].amount += amount;
        } else if (status === "pending" || status === "registered") {
          summary.totalPending.count++;
          summary.totalPending.amount += amount;
          summary.totalPending.byType[donationType].count++;
          summary.totalPending.byType[donationType].amount += amount;

          project.pending.count++;
          project.pending.amount += amount;
          project.byType[donationType].count++;
          project.byType[donationType].amount += amount;
        } else if (status === "failed") {
          summary.totalFailed.count++;
          summary.totalFailed.amount += amount;
          summary.totalFailed.byType[donationType].count++;
          summary.totalFailed.byType[donationType].amount += amount;

          project.failed.count++;
          project.failed.amount += amount;
          project.byType[donationType].count++;
          project.byType[donationType].amount += amount;
        }
        // Note: Other statuses (cancelled, etc.) are not counted in any category
      }

      // Convert project map to array and sort by project name
      const byProject = Array.from(projectData.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName),
      );

      const reportData: DonationReportData = {
        period: {
          type: period.type,
          startDate: period.startDate,
          endDate: period.endDate,
          label: period.label,
        },
        summary,
        byProject,
      };

      this.logger.log(
        `Report generated successfully: ${summary.totalReceived.count} received, ${summary.totalPending.count} pending, ${summary.totalFailed.count} failed`,
      );

      return reportData;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send report via email
   * Supports single email (string) or multiple emails (string[])
   */
  async sendReportEmail(
    reportData: DonationReportData,
    recipientEmail?: string | string[],
  ): Promise<boolean> {
    try {
      const defaultEmails = this.getDefaultEmails();

      // Normalize to array: if string, convert to array; if array, use as-is; if undefined, use default
      let recipients: string[];
      if (!recipientEmail) {
        recipients = defaultEmails;
      } else if (Array.isArray(recipientEmail)) {
        recipients = recipientEmail.length > 0 ? recipientEmail : defaultEmails;
      } else {
        recipients = [recipientEmail];
      }

      // Filter out any empty or invalid emails
      const validRecipients = recipients.filter(
        (email) => email && typeof email === "string" && email.includes("@"),
      );

      if (validRecipients.length === 0) {
        this.logger.warn(
          "No valid email recipients provided, using default emails",
        );
        validRecipients.push(...defaultEmails);
      }

      const recipientsList = validRecipients.join(", ");
      this.logger.log(
        `Sending ${reportData.period.type} report email to ${validRecipients.length} recipient(s): ${recipientsList}`,
      );

      // Generate HTML email
      const htmlContent = this.generateReportEmailHtml(reportData);
      const textContent = this.generateReportEmailText(reportData);

      // Ensure validRecipients is a proper array (not stringified)
      const emailRecipients: string[] = Array.isArray(validRecipients)
        ? [...validRecipients] // Create a new array copy
        : [validRecipients as string];

      // Use email service to send (pass array of recipients)
      const emailSent = await this.emailService.sendReportEmail({
        to: emailRecipients,
        subject: `Donations ${reportData.period.type.charAt(0).toUpperCase() + reportData.period.type.slice(1)} Report - ${reportData.period.label}`,
        html: htmlContent,
        text: textContent,
      });

      if (emailSent) {
        this.logger.log(
          `Report email sent successfully to ${emailRecipients.length} recipient(s): ${recipientsList}`,
        );
      } else {
        this.logger.warn(`Failed to send report email to ${recipientsList}`);
      }

      return emailSent;
    } catch (error: any) {
      this.logger.error(
        `Failed to send report email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Generate and send daily report
   * Supports single email (string) or multiple emails (string[])
   */
  async generateAndSendDailyReport(
    recipientEmail?: string | string[],
  ): Promise<boolean> {
    try {
      const reportData = await this.generateDailyReport();
      return await this.sendReportEmail(reportData, recipientEmail);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate and send daily report: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Generate and send weekly report
   * Supports single email (string) or multiple emails (string[])
   */
  async generateAndSendWeeklyReport(
    recipientEmail?: string | string[],
  ): Promise<boolean> {
    try {
      const reportData = await this.generateWeeklyReport();
      return await this.sendReportEmail(reportData, recipientEmail);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate and send weekly report: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Generate and send monthly report
   * Supports single email (string) or multiple emails (string[])
   */
  async generateAndSendMonthlyReport(
    recipientEmail?: string | string[],
  ): Promise<boolean> {
    try {
      const reportData = await this.generateMonthlyReport();
      return await this.sendReportEmail(reportData, recipientEmail);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate and send monthly report: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Helper: Get donation type category
   */
  private getDonationType(
    type: string | null | undefined,
  ): "zakat" | "sadqa" | "general" {
    if (!type) return "general";
    const lowerType = type.toLowerCase();
    if (lowerType === "zakat") return "zakat";
    if (lowerType === "sadqa" || lowerType === "sadaqah") return "sadqa";
    return "general";
  }

  /**
   * Helper: Get project name from ID
   */
  private getProjectName(projectId: string): string {
    const project = this.PROJECTS.find((p) => p.id === projectId);
    return project ? project.title : projectId;
  }

  /**
   * Generate HTML email content
   */
  private generateReportEmailHtml(reportData: DonationReportData): string {
    const { period, summary, byProject } = reportData;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
      }).format(amount);
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donations Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 900px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .section { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .section h2 { color: #2c5aa0; margin-top: 0; }
          .section h3 { color: #2c5aa0; margin-top: 30px; margin-bottom: 15px; }
          
          /* Summary Grid - Table-based for email client compatibility */
          .summary-grid { 
            width: 100%; 
            margin: 20px 0; 
            border-collapse: separate;
            border-spacing: 15px;
          }
          .summary-grid td {
            width: 33.33%;
            vertical-align: top;
          }
          .summary-card { 
            background-color: #ffffff; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #2c5aa0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .summary-card.received { border-left-color: #28a745; }
          .summary-card.pending { border-left-color: #ffc107; }
          .summary-card.failed { border-left-color: #dc3545; }
          .summary-card h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; }
          .summary-card .amount { font-size: 24px; font-weight: bold; color: #2c5aa0; margin: 8px 0; }
          .summary-card.received .amount { color: #28a745; }
          .summary-card.pending .amount { color: #ffc107; }
          .summary-card.failed .amount { color: #dc3545; }
          .summary-card .count { font-size: 14px; color: #666; margin-top: 8px; }
          
          /* Type Breakdown - Table-based for email client compatibility */
          .type-breakdown { 
            width: 100%; 
            margin-top: 20px; 
            border-collapse: separate;
            border-spacing: 15px;
          }
          .type-breakdown td {
            width: 33.33%;
            vertical-align: top;
          }
          .type-card { 
            background-color: #ffffff; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #2c5aa0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .type-card.zakat { border-left-color: #17a2b8; }
          .type-card.sadqa { border-left-color: #6f42c1; }
          .type-card.general { border-left-color: #fd7e14; }
          .type-card strong { 
            display: block; 
            margin-bottom: 12px; 
            font-size: 18px; 
            color: #2c5aa0;
            font-weight: 600;
          }
          .type-card .type-detail { 
            font-size: 14px; 
            line-height: 1.8;
            color: #333;
          }
          .type-card .type-detail .status-label { 
            font-weight: 600; 
            color: #555;
          }
          
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          table th { background-color: #2c5aa0; color: white; }
          table tr:hover { background-color: #f5f5f5; }
          
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          
          /* Mobile Responsive Styles - Using max-width for email clients */
          @media only screen and (max-width: 600px) {
            .container { padding: 10px !important; }
            .content { padding: 15px !important; }
            .section { padding: 15px !important; margin: 15px 0 !important; }
            
            /* Stack cards vertically on mobile - table cells become block */
            .summary-grid td,
            .type-breakdown td { 
              display: block !important;
              width: 100% !important;
              margin-bottom: 15px !important;
            }
            
            .summary-card,
            .type-card { 
              padding: 18px !important; 
              margin-bottom: 15px !important;
            }
            
            .summary-card .amount { 
              font-size: 22px !important; 
            }
            
            table { 
              font-size: 14px !important; 
            }
            
            table th, table td { 
              padding: 8px !important; 
            }
          }
          
          @media only screen and (max-width: 480px) {
            .header { padding: 15px !important; }
            .header h1 { font-size: 20px !important; }
            .summary-card h3 { font-size: 14px !important; }
            .summary-card .amount { font-size: 20px !important; }
            .type-card strong { font-size: 16px !important; }
            .type-card .type-detail { font-size: 12px !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Donations Report</h1>
            <p>${period.label}</p>
          </div>
          
          <div class="content">
            <!-- Summary Section -->
            <div class="section">
              <h2>Summary</h2>
              <table class="summary-grid" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 15px;">
                <tr>
                  <td class="summary-card received" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">✅ Received (Completed)</h3>
                    <div class="amount" style="font-size: 24px; font-weight: bold; color: #28a745; margin: 8px 0;">${formatCurrency(summary.totalReceived.amount)}</div>
                    <div class="count" style="font-size: 14px; color: #666; margin-top: 8px;">${summary.totalReceived.count} donations</div>
                  </td>
                  <td class="summary-card pending" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">⏳ Pending</h3>
                    <div class="amount" style="font-size: 24px; font-weight: bold; color: #ffc107; margin: 8px 0;">${formatCurrency(summary.totalPending.amount)}</div>
                    <div class="count" style="font-size: 14px; color: #666; margin-top: 8px;">${summary.totalPending.count} donations</div>
                  </td>
                  <td class="summary-card failed" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">❌ Failed</h3>
                    <div class="amount" style="font-size: 24px; font-weight: bold; color: #dc3545; margin: 8px 0;">${formatCurrency(summary.totalFailed.amount)}</div>
                    <div class="count" style="font-size: 14px; color: #666; margin-top: 8px;">${summary.totalFailed.count} donations</div>
                  </td>
                </tr>
              </table>

              <!-- Type Breakdown -->
              <h3>By Donation Type</h3>
              <table class="type-breakdown" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 15px;">
                <tr>
                  <td class="type-card zakat" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong style="display: block; margin-bottom: 12px; font-size: 18px; color: #2c5aa0; font-weight: 600;">Zakat</strong>
                    <div class="type-detail" style="font-size: 14px; line-height: 1.8; color: #333;">
                      <div><span style="font-weight: 600; color: #555;">Received:</span> ${formatCurrency(summary.totalReceived.byType.zakat.amount)} (${summary.totalReceived.byType.zakat.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Pending:</span> ${formatCurrency(summary.totalPending.byType.zakat.amount)} (${summary.totalPending.byType.zakat.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Failed:</span> ${formatCurrency(summary.totalFailed.byType.zakat.amount)} (${summary.totalFailed.byType.zakat.count})</div>
                    </div>
                  </td>
                  <td class="type-card sadqa" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #6f42c1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong style="display: block; margin-bottom: 12px; font-size: 18px; color: #2c5aa0; font-weight: 600;">Sadqa</strong>
                    <div class="type-detail" style="font-size: 14px; line-height: 1.8; color: #333;">
                      <div><span style="font-weight: 600; color: #555;">Received:</span> ${formatCurrency(summary.totalReceived.byType.sadqa.amount)} (${summary.totalReceived.byType.sadqa.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Pending:</span> ${formatCurrency(summary.totalPending.byType.sadqa.amount)} (${summary.totalPending.byType.sadqa.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Failed:</span> ${formatCurrency(summary.totalFailed.byType.sadqa.amount)} (${summary.totalFailed.byType.sadqa.count})</div>
                    </div>
                  </td>
                  <td class="type-card general" style="width: 33.33%; background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #fd7e14; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <strong style="display: block; margin-bottom: 12px; font-size: 18px; color: #2c5aa0; font-weight: 600;">General</strong>
                    <div class="type-detail" style="font-size: 14px; line-height: 1.8; color: #333;">
                      <div><span style="font-weight: 600; color: #555;">Received:</span> ${formatCurrency(summary.totalReceived.byType.general.amount)} (${summary.totalReceived.byType.general.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Pending:</span> ${formatCurrency(summary.totalPending.byType.general.amount)} (${summary.totalPending.byType.general.count})</div>
                      <div><span style="font-weight: 600; color: #555;">Failed:</span> ${formatCurrency(summary.totalFailed.byType.general.amount)} (${summary.totalFailed.byType.general.count})</div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Project Breakdown -->
            <div class="section">
              <h2>By Programs</h2>
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Received</th>
                    <th>Pending</th>
                    <th>Failed</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${byProject
                    .map(
                      (project) => `
                    <tr>
                      <td><strong>${project.projectName}</strong></td>
                      <td>${formatCurrency(project.received.amount)}<br><small>(${project.received.count})</small></td>
                      <td>${formatCurrency(project.pending.amount)}<br><small>(${project.pending.count})</small></td>
                      <td>${formatCurrency(project.failed.amount)}<br><small>(${project.failed.count})</small></td>
                      <td><strong>${formatCurrency(project.received.amount + project.pending.amount + project.failed.amount)}</strong></td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated report generated by MTJ Foundation ERP System.</p>
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text email content
   */
  private generateReportEmailText(reportData: DonationReportData): string {
    const { period, summary, byProject } = reportData;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
      }).format(amount);
    };

    let text = `DONATIONS REPORT\n`;
    text += `${period.label}\n`;
    text += `\n${"=".repeat(50)}\n\n`;

    text += `SUMMARY\n`;
    text += `--------\n`;
    text += `Received: ${formatCurrency(summary.totalReceived.amount)} (${summary.totalReceived.count} donations)\n`;
    text += `Pending: ${formatCurrency(summary.totalPending.amount)} (${summary.totalPending.count} donations)\n`;
    text += `Failed: ${formatCurrency(summary.totalFailed.amount)} (${summary.totalFailed.count} donations)\n\n`;

    text += `BY DONATION TYPE\n`;
    text += `----------------\n`;
    text += `Zakat:\n`;
    text += `  Received: ${formatCurrency(summary.totalReceived.byType.zakat.amount)} (${summary.totalReceived.byType.zakat.count})\n`;
    text += `  Pending: ${formatCurrency(summary.totalPending.byType.zakat.amount)} (${summary.totalPending.byType.zakat.count})\n`;
    text += `  Failed: ${formatCurrency(summary.totalFailed.byType.zakat.amount)} (${summary.totalFailed.byType.zakat.count})\n\n`;
    text += `Sadqa:\n`;
    text += `  Received: ${formatCurrency(summary.totalReceived.byType.sadqa.amount)} (${summary.totalReceived.byType.sadqa.count})\n`;
    text += `  Pending: ${formatCurrency(summary.totalPending.byType.sadqa.amount)} (${summary.totalPending.byType.sadqa.count})\n`;
    text += `  Failed: ${formatCurrency(summary.totalFailed.byType.sadqa.amount)} (${summary.totalFailed.byType.sadqa.count})\n\n`;
    text += `General:\n`;
    text += `  Received: ${formatCurrency(summary.totalReceived.byType.general.amount)} (${summary.totalReceived.byType.general.count})\n`;
    text += `  Pending: ${formatCurrency(summary.totalPending.byType.general.amount)} (${summary.totalPending.byType.general.count})\n`;
    text += `  Failed: ${formatCurrency(summary.totalFailed.byType.general.amount)} (${summary.totalFailed.byType.general.count})\n\n`;

    text += `BY PROJECT\n`;
    text += `----------\n`;
    byProject.forEach((project) => {
      text += `${project.projectName}:\n`;
      text += `  Received: ${formatCurrency(project.received.amount)} (${project.received.count})\n`;
      text += `  Pending: ${formatCurrency(project.pending.amount)} (${project.pending.count})\n`;
      text += `  Failed: ${formatCurrency(project.failed.amount)} (${project.failed.count})\n`;
      text += `  Total: ${formatCurrency(project.received.amount + project.pending.amount + project.failed.amount)}\n\n`;
    });

    text += `\n${"=".repeat(50)}\n`;
    text += `This is an automated report generated by MTJ Foundation ERP System.\n`;
    text += `© ${new Date().getFullYear()} MTJ Foundation. All rights reserved.\n`;

    return text;
  }
}
