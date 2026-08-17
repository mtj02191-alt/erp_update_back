import { Injectable } from "@nestjs/common";
import { DonationBoxService } from "../../dms/donation_box/donation-box.service";
import {
  BoxStatus,
  BoxType,
  CollectionFrequency,
} from "../../dms/donation_box/entities/donation-box.entity";
import {
  EntityImportHandler,
  ImportBatchResult,
  ImportRowResult,
} from "./import-handler.interface";

/** Map Excel / human headers → canonical import keys. */
const HEADER_ALIASES: Record<string, string> = {
  // Excel sheet headers (after normalize)
  sr_no: "_ignore",
  serial_no: "_ignore",
  box_id_no: "box_id_no",
  box_no: "box_id_no",
  box_id: "box_id_no",
  key_no: "key_no",
  region: "region_name",
  city: "city_name",
  city_name: "city_name",
  frd_officer_reference: "frd_officer_reference",
  frd_officer: "frd_officer_reference",
  shop_name: "shop_name",
  shopkeeper: "shopkeeper",
  cell_no: "cell_no",
  address: "address",
  google_coordinates: "google_coordinates",
  coordinates: "google_coordinates",
  landmark_marketplace: "landmark_marketplace",
  landmark: "landmark_marketplace",
  route: "route",
  route_name: "route_name",
  route_id: "route_id",
  box_type: "box_type",
  active_since: "active_since",
  status: "status",
  collection_frequency: "frequency",
  frequency: "frequency",
  assigned_user_id: "assigned_user_ids",
  assigned_user_ids: "assigned_user_ids",
  notes: "notes",
};

@Injectable()
export class DonationBoxImportHandler implements EntityImportHandler {
  readonly entityName = "donation_box";

  constructor(private readonly donationBoxService: DonationBoxService) {}

  getRequiredHeaders(): string[] {
    return ["shop_name"];
  }

  getOptionalHeaders(): string[] {
    return [
      "box_id_no",
      "box_no",
      "key_no",
      "route_id",
      "route_name",
      "route",
      "city_id",
      "city_name",
      "city",
      "region",
      "region_name",
      "shopkeeper",
      "cell_no",
      "address",
      "google_coordinates",
      "landmark_marketplace",
      "landmark",
      "box_type",
      "status",
      "frequency",
      "collection_frequency",
      "active_since",
      "notes",
      "assigned_user_ids",
      "frd_officer_reference",
      "frd_officer",
    ];
  }

  /** Normalize "Key No." / "Landmark / Marketplace" → key_no / landmark_marketplace */
  private normalizeHeader(key: string): string {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/[./\\]+/g, " ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_");
  }

  private mapRow(raw: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = this.normalizeHeader(key);
      if (!normalizedKey || normalizedKey === "sr_no") return;
      const target = HEADER_ALIASES[normalizedKey] || normalizedKey;
      if (target === "_ignore") return;
      mapped[target] = value;
    });
    return mapped;
  }

  private parseOptionalInt(value: string | undefined): number | undefined {
    if (!value || String(value).trim() === "") return undefined;
    const n = Number(String(value).trim());
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }

  private parseIdList(value: string | undefined): number[] {
    if (!value?.trim()) return [];
    return value
      .split(/[,;|]/)
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  }

  private normalizeEnum<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    fallback: T,
  ): T {
    const v = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") as T;
    if (allowed.includes(v)) return v;
    // "Large" / "Active" already lowercased; also try without hyphens
    const compact = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "") as string;
    const match = allowed.find(
      (a) => a.replace(/[\s_-]+/g, "") === compact,
    );
    return (match as T) || fallback;
  }

  /** Supports full dates, or month-only (+ import year) → first of that month. */
  private parseDateToIso(
    value: string | undefined,
    importYear?: number,
  ): string {
    const raw = String(value || "").trim();
    if (!raw) {
      if (importYear && importYear >= 1900 && importYear <= 2100) {
        return `${importYear}-01-01`;
      }
      return new Date().toISOString().split("T")[0];
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // DD/MM/YYYY or DD-MM-YYYY
    const full = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (full) {
      const day = full[1].padStart(2, "0");
      const month = full[2].padStart(2, "0");
      const year = full[3];
      return `${year}-${month}-${day}`;
    }

    // MM/YYYY or MM-YYYY → first of month
    const monthYear = raw.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (monthYear) {
      const month = Number(monthYear[1]);
      const year = Number(monthYear[2]);
      if (month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, "0")}-01`;
      }
    }

    // Month only (12, Dec, December) + import year → first of that month
    const monthNum = this.parseMonthNumber(raw);
    if (monthNum != null) {
      const year =
        importYear && importYear >= 1900 && importYear <= 2100
          ? importYear
          : new Date().getFullYear();
      return `${year}-${String(monthNum).padStart(2, "0")}-01`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }

    return new Date().toISOString().split("T")[0];
  }

  /** Parse "12", "Dec", "December" → 1–12, else null. */
  private parseMonthNumber(value: string): number | null {
    const raw = String(value || "").trim();
    if (!raw) return null;

    if (/^\d{1,2}$/.test(raw)) {
      const n = Number(raw);
      return n >= 1 && n <= 12 ? n : null;
    }

    const key = raw.toLowerCase().replace(/\./g, "");
    const months: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };
    return months[key] ?? null;
  }

  /**
   * Excel "Route" is always a route name (e.g. "16"), even if numeric.
   * Only an explicit route_id column is treated as DB id.
   */
  private resolveRouteFields(row: Record<string, string>): {
    route_id?: number;
    route_name?: string;
  } {
    const explicitId = this.parseOptionalInt(row.route_id);
    if (explicitId) return { route_id: explicitId };

    const routeName = String(row.route || row.route_name || "").trim();
    if (!routeName) return {};
    return { route_name: routeName };
  }

  /**
   * Google Coordinates may be "lat,lng" or a Plus Code like "F37W+WRX Faisalabad".
   */
  private parseGoogleCoordinates(value: string | undefined): {
    registration_latitude?: number;
    registration_longitude?: number;
    registration_location_name?: string;
  } {
    const raw = String(value || "").trim();
    if (!raw) return {};

    const pair = raw.match(
      /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/,
    );
    if (pair) {
      const lat = Number(pair[1]);
      const lng = Number(pair[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      ) {
        return {
          registration_latitude: lat,
          registration_longitude: lng,
          registration_location_name: raw,
        };
      }
    }

    return { registration_location_name: raw };
  }

  async importRows(
    rows: Record<string, string>[],
    user: any,
    options?: { year?: number },
  ): Promise<ImportBatchResult> {
    const results: ImportRowResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    /** Same shop + shopkeeper + phone in one file → skip after first. */
    const seenIdentityInFile = new Map<string, number>();
    const importYear =
      options?.year != null &&
      Number.isInteger(options.year) &&
      options.year >= 1900 &&
      options.year <= 2100
        ? options.year
        : undefined;

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = this.mapRow(rows[i]);
      const shopName = String(row.shop_name || "").trim();
      const keyNo = String(row.key_no || "").trim();
      const boxIdNo = String(row.box_id_no || "").trim();

      if (
        !shopName &&
        !keyNo &&
        !boxIdNo &&
        !row.route_id &&
        !row.route_name &&
        !row.route
      ) {
        skippedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          skipped: true,
          error: "Empty row skipped",
          skip_reason: "Empty row (no shop_name / key_no / box_id_no / route)",
        });
        continue;
      }

      if (!shopName) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          error: "shop_name is required",
        });
        continue;
      }

      const { route_id, route_name } = this.resolveRouteFields(row);

      const cityName = String(row.city_name || "").trim();
      const cityId = this.parseOptionalInt(row.city_id);
      if (!cityId && !cityName) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: shopName,
          error: "City is required (city name or city_id)",
        });
        continue;
      }

      const coords = this.parseGoogleCoordinates(row.google_coordinates);
      const hasGps =
        coords.registration_latitude != null &&
        coords.registration_longitude != null;

      const payload: Record<string, unknown> = {
        box_id_no: boxIdNo || null,
        shop_name: shopName,
        key_no: keyNo || null,
        route_id,
        route_name,
        city_id: cityId,
        city_name: cityName || undefined,
        region_name: row.region_name?.trim() || undefined,
        shopkeeper: row.shopkeeper?.trim() || undefined,
        cell_no: row.cell_no?.trim() || undefined,
        address: row.address?.trim() || undefined,
        landmark_marketplace: row.landmark_marketplace?.trim() || undefined,
        box_type: this.normalizeEnum(
          row.box_type,
          Object.values(BoxType),
          BoxType.MEDIUM,
        ),
        status: this.normalizeEnum(
          row.status,
          Object.values(BoxStatus),
          BoxStatus.ACTIVE,
        ),
        frequency: this.normalizeEnum(
          row.frequency,
          Object.values(CollectionFrequency),
          CollectionFrequency.WEEKLY,
        ),
        active_since: this.parseDateToIso(row.active_since, importYear),
        notes: row.notes?.trim() || undefined,
        frd_officer_reference: row.frd_officer_reference?.trim() || undefined,
        assigned_user_ids: this.parseIdList(row.assigned_user_ids),
        ...coords,
        require_collection_location: hasGps,
      };

      try {
        let resolvedCityId = cityId;
        if (!resolvedCityId && cityName) {
          const geo = await this.donationBoxService.resolveGeoForImportRow(
            payload,
          );
          resolvedCityId = geo.city_id;
          payload.city_id = resolvedCityId;
        }

        const shopkeeper = String(row.shopkeeper || "").trim();
        const cellNo = String(row.cell_no || "").trim();
        const identityKey = this.buildShopIdentityKey(
          shopName,
          shopkeeper,
          cellNo,
        );
        if (identityKey) {
          const seenId = seenIdentityInFile.get(identityKey);
          if (seenId) {
            skippedCount += 1;
            const reason = `Duplicate in this CSV: same shop "${shopName}" + shopkeeper "${shopkeeper || "(empty)"}" + phone "${cellNo || "(empty)"}" already processed (kept id ${seenId}). box_id_no=${boxIdNo || "null"}, key_no=${keyNo || "null"}`;
            results.push({
              row: rowNumber,
              success: true,
              skipped: true,
              email: shopName,
              id: seenId,
              skip_reason: reason,
              error: reason,
            });
            continue;
          }
        }

        const existing =
          await this.donationBoxService.findExistingDonationBoxForImportRow(
            payload,
          );
        if (existing) {
          if (identityKey) {
            seenIdentityInFile.set(identityKey, existing.box.id);
          }
          skippedCount += 1;
          const reason = existing.reason;
          results.push({
            row: rowNumber,
            success: true,
            skipped: true,
            email: shopName,
            id: existing.box.id,
            skip_reason: reason,
            error: reason,
          });
          continue;
        }

        const { box, skipped, skip_reason } =
          await this.donationBoxService.importDonationBoxRow(payload, user);
        if (identityKey) {
          seenIdentityInFile.set(identityKey, box.id);
        }
        if (skipped) {
          skippedCount += 1;
          const reason =
            skip_reason ||
            `Already in DB (id ${box.id}); box_id_no=${boxIdNo || "null"}, key_no=${keyNo || "null"}`;
          results.push({
            row: rowNumber,
            success: true,
            skipped: true,
            email: shopName,
            id: box.id,
            skip_reason: reason,
            error: reason,
          });
        } else {
          successCount += 1;
          results.push({
            row: rowNumber,
            success: true,
            skipped: false,
            email: shopName,
            id: box.id,
          });
        }
      } catch (err: any) {
        failedCount += 1;
        results.push({
          row: rowNumber,
          success: false,
          email: shopName,
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

  /** shop + shopkeeper + digits-only phone — same shop name alone is not a duplicate. */
  private buildShopIdentityKey(
    shopName: string,
    shopkeeper: string,
    cellNo: string,
  ): string | null {
    const shop = String(shopName || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!shop) return null;
    const keeper = String(shopkeeper || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const phone = String(cellNo || "").replace(/\D/g, "");
    return `${shop}|${keeper}|${phone}`;
  }
}
