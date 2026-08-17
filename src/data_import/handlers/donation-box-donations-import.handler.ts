import { Injectable } from "@nestjs/common";
import { DonationBoxDonationService } from "../../dms/donation_box/donation_box_donation/donation_box_donation.service";
import {
  CollectionStatus,
  PaymentMethod,
} from "../../dms/donation_box/donation_box_donation/entities/donation_box_donation.entity";
import {
  EntityImportHandler,
  ImportBatchResult,
  ImportRowResult,
} from "./import-handler.interface";

const HEADER_ALIASES: Record<string, string> = {
  box_id: "donation_box_id",
  box_key: "key_no",
  box_key_no: "key_no",
  amount: "collection_amount",
  date: "collection_date",
};

@Injectable()
export class DonationBoxDonationsImportHandler implements EntityImportHandler {
  readonly entityName = "donation_box_donations";

  constructor(
    private readonly donationBoxDonationService: DonationBoxDonationService,
  ) {}

  getRequiredHeaders(): string[] {
    return ["collection_amount", "collection_date"];
  }

  getOptionalHeaders(): string[] {
    return [
      "donation_box_id",
      "key_no",
      "shop_name",
      "collector_name",
      "collected_by_id",
      "notes",
      "payment_method",
      "status",
      "receipt_number",
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

  private parseOptionalInt(value: string | undefined): number | undefined {
    if (!value || String(value).trim() === "") return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }

  private parseAmount(value: string | undefined): number | null {
    if (!value || String(value).trim() === "") return null;
    const n = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }

  private normalizeEnum<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    fallback: T,
  ): T {
    const v = String(value || "")
      .trim()
      .toLowerCase() as T;
    return allowed.includes(v) ? v : fallback;
  }

  async importRows(
    rows: Record<string, string>[],
    user: any,
  ): Promise<ImportBatchResult> {
    const results: ImportRowResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = this.mapRow(rows[i]);

      const amount = this.parseAmount(row.collection_amount);
      const collectionDate = row.collection_date?.trim();
      const boxId = this.parseOptionalInt(row.donation_box_id);
      const keyNo = row.key_no?.trim();
      const shopName = row.shop_name?.trim();

      if (!amount && !collectionDate && !boxId && !keyNo && !shopName) {
        skippedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "Empty row skipped",
        });
        continue;
      }

      if (amount == null || amount <= 0) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "collection_amount must be a number greater than 0",
        });
        continue;
      }

      if (!collectionDate) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "collection_date is required (YYYY-MM-DD)",
        });
        continue;
      }

      if (!boxId && !keyNo && !shopName) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "donation_box_id, key_no, or shop_name is required",
        });
        continue;
      }

      const payload: Record<string, unknown> = {
        donation_box_id: boxId,
        key_no: keyNo,
        shop_name: shopName,
        collection_amount: amount,
        collection_date: collectionDate,
        collector_name: row.collector_name?.trim() || undefined,
        collected_by_id: this.parseOptionalInt(row.collected_by_id),
        notes: row.notes?.trim() || undefined,
        payment_method: this.normalizeEnum(
          row.payment_method,
          Object.values(PaymentMethod),
          PaymentMethod.CASH,
        ),
        status: this.normalizeEnum(
          row.status,
          Object.values(CollectionStatus),
          CollectionStatus.PENDING,
        ),
        receipt_number: row.receipt_number?.trim() || undefined,
      };

      const label = keyNo || shopName || String(boxId || "");

      try {
        const saved =
          await this.donationBoxDonationService.importDonationBoxDonationRow(
            payload,
            user,
          );
        successCount += 1;
        results.push({
          row: rowNumber,
          success: true,
          email: label,
          id: saved.id,
        });
      } catch (err: any) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: label,
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
