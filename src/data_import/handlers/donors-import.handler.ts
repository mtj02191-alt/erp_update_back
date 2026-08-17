import { Injectable } from "@nestjs/common";
import { DonorService } from "../../dms/donor/donor.service";
import { DonorType } from "../../dms/donor/entities/donor.entity";
import { OrganizationsService } from "../../dms/organizations/organizations.service";
import {
  EntityImportHandler,
  ImportBatchResult,
  ImportRowResult,
} from "./import-handler.interface";

const HEADER_ALIASES: Record<string, string> = {
  assigned_user_id: "assigned_to_user_id",
  assignee_user_id: "assigned_to_user_id",
  referrer_id: "referrer_user_id",
  type: "donor_type",
  company_name: "organization_name",
  organization: "organization_name",
  contact_person: "name",
};

@Injectable()
export class DonorsImportHandler implements EntityImportHandler {
  readonly entityName = "donors";

  constructor(
    private readonly donorService: DonorService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  getRequiredHeaders(): string[] {
    return ["donor_type", "email", "phone"];
  }

  getOptionalHeaders(): string[] {
    return [
      "name",
      "first_name",
      "last_name",
      "cnic",
      "organization_name",
      "organization_id",
      "organization_registration",
      "organization_email",
      "organization_phone",
      "organization_address",
      "affiliation_role",
      "address",
      "city",
      "country",
      "postal_code",
      "source",
      "notes",
      "is_active",
      "notification_subscription",
      "recurring",
      "multi_time_donor",
      "assigned_to_user_id",
      "referrer_user_id",
      "password",
    ];
  }

  private mapRow(raw: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
      const target = HEADER_ALIASES[normalizedKey] || normalizedKey;
      mapped[target] = value;
    });
    return mapped;
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

  private parseOptionalInt(value: string | undefined): number | undefined {
    if (!value || String(value).trim() === "") return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }

  private normalizeDonorType(value: string): DonorType | null {
    const v = String(value || "")
      .trim()
      .toLowerCase();
    if (["individual", "ind", "person"].includes(v)) return DonorType.INDIVIDUAL;
    if (["csr", "corporate", "company", "corp"].includes(v)) return DonorType.CSR;
    return null;
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

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = this.mapRow(rows[i]);

      const emailRaw = String(row.email || "").trim().toLowerCase();
      const phone = String(row.phone || "").trim();
      const donorType = this.normalizeDonorType(row.donor_type);

      if (!emailRaw && !phone && !row.name && !row.organization_name) {
        skippedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "Empty row skipped",
        });
        continue;
      }

      if (!donorType) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw || undefined,
          error: "Invalid or missing donor_type (use individual or csr)",
        });
        continue;
      }

      if (!emailRaw) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "Email is required",
        });
        continue;
      }

      if (!phone) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw,
          error: "Phone is required",
        });
        continue;
      }

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

      const name =
        row.name?.trim() ||
        `${row.first_name || ""} ${row.last_name || ""}`.trim();
      if (!name) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw,
          error: "Name is required",
        });
        continue;
      }

      const payload: Record<string, any> = {
        donor_type: donorType,
        email: emailRaw,
        phone,
        name,
        first_name: row.first_name?.trim() || undefined,
        last_name: row.last_name?.trim() || undefined,
        address: row.address?.trim() || undefined,
        city: row.city?.trim() || undefined,
        country: row.country?.trim() || undefined,
        postal_code: row.postal_code?.trim() || undefined,
        source: row.source?.trim() || "import",
        notes: row.notes?.trim() || undefined,
        cnic: row.cnic?.trim() || undefined,
        is_active: this.parseBool(row.is_active, true),
        notification_subscription: this.parseBool(
          row.notification_subscription,
          true,
        ),
        recurring: this.parseBool(row.recurring, false),
        multi_time_donor: this.parseBool(row.multi_time_donor, false),
        assigned_to_user_id: this.parseOptionalInt(row.assigned_to_user_id),
        referrer_user_id: this.parseOptionalInt(row.referrer_user_id),
        password: row.password?.trim() || undefined,
        affiliation_role: row.affiliation_role?.trim() || undefined,
      };

      try {
        let organizationId = this.parseOptionalInt(row.organization_id);
        if (!organizationId && row.organization_name?.trim()) {
          const org = await this.organizationsService.findOrCreateFromCompanyFields(
            {
              company_name: row.organization_name,
              company_registration:
                row.organization_registration?.trim() || undefined,
              company_email: row.organization_email?.trim() || undefined,
              company_phone: row.organization_phone?.trim() || undefined,
              company_address: row.organization_address?.trim() || undefined,
              city: row.city?.trim() || undefined,
              country: row.country?.trim() || undefined,
            },
          );
          organizationId = org?.id;
        }

        if (donorType === DonorType.CSR && !organizationId) {
          failedCount += 1;
          results.push({
            row: rowNumber,
            success: false,
            email: emailRaw,
            error:
              "organization_name or organization_id is required for csr donors",
          });
          continue;
        }

        if (organizationId) {
          payload.organization_id = organizationId;
        }

        const saved = await this.donorService.importDonorRow(payload, user);
        successCount += 1;
        results.push({
          row: rowNumber,
          success: true,
          email: emailRaw,
          id: saved.id,
        });
      } catch (err: any) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: emailRaw,
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
