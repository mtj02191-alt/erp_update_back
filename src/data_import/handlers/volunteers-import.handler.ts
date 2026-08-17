import { Injectable } from "@nestjs/common";
import { VolunteerService } from "../../volunteer/volunteer.service";
import {
  EntityImportHandler,
  ImportBatchResult,
  ImportRowResult,
} from "./import-handler.interface";

@Injectable()
export class VolunteersImportHandler implements EntityImportHandler {
  readonly entityName = "volunteers";

  constructor(private readonly volunteerService: VolunteerService) {}

  getRequiredHeaders(): string[] {
    return ["name", "phone"];
  }

  getOptionalHeaders(): string[] {
    return [
      "email",
      "cnic",
      "date_of_birth",
      "gender",
      "city",
      "area",
      "availability",
      "availability_days",
      "hours_per_week",
      "willing_to_travel",
      "skills",
      "interest_areas",
      "category",
      "motivation",
      "emergency_contact_name",
      "emergency_contact_phone",
      "emergency_contact_relation",
      "status",
      "assigned_department",
      "interview_required",
      "verification_status",
      "source",
      "comments",
    ];
  }

  private mapRow(raw: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      mapped[key.trim().toLowerCase().replace(/\s+/g, "_")] = value;
    });
    return mapped;
  }

  private parseList(value: string | undefined): string[] | undefined {
    if (!value?.trim()) return undefined;
    const items = value
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  private parseBool(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === null || String(value).trim() === "") {
      return defaultValue;
    }
    const v = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n"].includes(v)) return false;
    return defaultValue;
  }

  async importRows(
    rows: Record<string, string>[],
    user: any,
  ): Promise<ImportBatchResult> {
    const results: ImportRowResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = this.mapRow(rows[i]);

      const name = String(row.name || "").trim();
      const phone = String(row.phone || "").trim();
      const emailRaw = String(row.email || "")
        .trim()
        .toLowerCase();

      if (!name && !phone && !emailRaw) {
        skippedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "Empty row skipped",
        });
        continue;
      }

      if (!name) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw || undefined,
          error: "name is required",
        });
        continue;
      }

      if (!phone) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw || name,
          error: "phone is required",
        });
        continue;
      }

      const phoneKey = phone.replace(/\D/g, "");
      if (seenPhones.has(phoneKey)) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw || name,
          error: "Duplicate phone in import file",
        });
        continue;
      }
      seenPhones.add(phoneKey);

      if (emailRaw) {
        if (seenEmails.has(emailRaw)) {
          failedCount += 1;
          results.push({
            row: rowNumber,
            success: false,
            email: emailRaw,
            error: "Duplicate email in import file",
          });
          continue;
        }
        seenEmails.add(emailRaw);
      }

      const payload: Record<string, unknown> = {
        name,
        phone,
        email: emailRaw || undefined,
        cnic: row.cnic?.trim() || undefined,
        date_of_birth: row.date_of_birth?.trim() || undefined,
        gender: row.gender?.trim().toLowerCase() || undefined,
        city: row.city?.trim() || undefined,
        area: row.area?.trim() || undefined,
        availability: row.availability?.trim() || undefined,
        availability_days: this.parseList(row.availability_days),
        hours_per_week: row.hours_per_week?.trim() || undefined,
        willing_to_travel: this.parseBool(row.willing_to_travel, false),
        skills: this.parseList(row.skills),
        interest_areas: this.parseList(row.interest_areas),
        category: row.category?.trim() || undefined,
        motivation: row.motivation?.trim() || undefined,
        emergency_contact_name: row.emergency_contact_name?.trim() || undefined,
        emergency_contact_phone:
          row.emergency_contact_phone?.trim() || undefined,
        emergency_contact_relation:
          row.emergency_contact_relation?.trim() || undefined,
        status: row.status?.trim().toLowerCase() || "pending",
        assigned_department: row.assigned_department?.trim() || undefined,
        interview_required: this.parseBool(row.interview_required, false),
        verification_status:
          row.verification_status?.trim().toLowerCase() || "unverified",
        source: row.source?.trim() || "import",
        comments: row.comments?.trim() || undefined,
        agreed_to_policy: true,
        declaration_accurate: true,
      };

      try {
        const saved = await this.volunteerService.importVolunteerRow(
          payload,
          user,
        );
        successCount += 1;
        results.push({
          row: rowNumber,
          success: true,
          email: emailRaw || name,
          id: saved.id,
        });
      } catch (err: any) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw || name,
          error: err?.message || "Import failed",
        });
      }
    }

    return {
      entity_name: this.entityName,
      total_rows: rows.length,
      success_count: successCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      results,
    };
  }
}
