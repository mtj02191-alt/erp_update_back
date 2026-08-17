import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PermissionsService } from "../permissions/permissions.service";
import { parseCsvBuffer } from "./utils/csv-parse.util";
import { DonorsImportHandler } from "./handlers/donors-import.handler";
import { DonationBoxImportHandler } from "./handlers/donation-box-import.handler";
import { DonationBoxDonationsImportHandler } from "./handlers/donation-box-donations-import.handler";
import { VolunteersImportHandler } from "./handlers/volunteers-import.handler";
import {
  EntityImportHandler,
  ImportBatchResult,
} from "./handlers/import-handler.interface";

const MAX_IMPORT_ROWS = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface EntityTemplateInfo {
  entity_name: string;
  headers: string[];
  sample_row: Record<string, string>;
}

@Injectable()
export class DataImportService {
  private readonly handlers: Map<string, EntityImportHandler>;

  constructor(
    private readonly donorsImportHandler: DonorsImportHandler,
    private readonly donationBoxImportHandler: DonationBoxImportHandler,
    private readonly donationBoxDonationsImportHandler: DonationBoxDonationsImportHandler,
    private readonly volunteersImportHandler: VolunteersImportHandler,
    private readonly permissionsService: PermissionsService,
  ) {
    this.handlers = new Map<string, EntityImportHandler>([
      [donorsImportHandler.entityName, donorsImportHandler],
      [donationBoxImportHandler.entityName, donationBoxImportHandler],
      [
        donationBoxDonationsImportHandler.entityName,
        donationBoxDonationsImportHandler,
      ],
      [volunteersImportHandler.entityName, volunteersImportHandler],
    ]);
  }

  listEntities(): string[] {
    return Array.from(this.handlers.keys());
  }

  getTemplate(entityName: string): EntityTemplateInfo {
    const handler = this.getHandler(entityName);
    const headers = [
      ...handler.getRequiredHeaders(),
      ...handler.getOptionalHeaders(),
    ];
    return {
      entity_name: entityName,
      headers,
      sample_row: this.buildSampleRow(entityName),
    };
  }

  private buildSampleRow(entityName: string): Record<string, string> {
    if (entityName === "donors") {
      return {
        donor_type: "individual",
        email: "donor@example.com",
        phone: "03001234567",
        name: "Sample Donor",
        first_name: "Sample",
        last_name: "Donor",
        city: "Lahore",
        country: "Pakistan",
        source: "import",
        is_active: "true",
        notification_subscription: "true",
        recurring: "false",
        multi_time_donor: "false",
      };
    }
    if (entityName === "donation_box") {
      return {
        shop_name: "Sample General Store",
        route_id: "1",
        city_id: "1",
        key_no: "KEY-001",
        shopkeeper: "Ahmed Khan",
        cell_no: "03001234567",
        landmark_marketplace: "Main Bazaar",
        box_type: "medium",
        status: "active",
        frequency: "weekly",
        active_since: new Date().toISOString().split("T")[0],
        notes: "Imported via CSV",
        assigned_user_ids: "",
      };
    }
    if (entityName === "donation_box_donations") {
      return {
        key_no: "KEY-001",
        collection_amount: "1500",
        collection_date: new Date().toISOString().split("T")[0],
        collector_name: "Field Officer",
        payment_method: "cash",
        status: "pending",
        notes: "Imported via CSV",
        receipt_number: "",
      };
    }
    if (entityName === "volunteers") {
      return {
        name: "Sample Volunteer",
        phone: "03001234567",
        email: "volunteer@example.com",
        cnic: "35202-1234567-1",
        gender: "male",
        city: "Lahore",
        area: "Model Town",
        availability: "weekends",
        availability_days: "saturday;sunday",
        skills: "teaching;field_work",
        interest_areas: "education;health",
        status: "pending",
        verification_status: "unverified",
        source: "import",
        comments: "Imported via CSV",
      };
    }
    return {};
  }

  private getHandler(entityName: string): EntityImportHandler {
    const key = String(entityName || "")
      .trim()
      .toLowerCase();
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new NotFoundException(
        `Import not supported for entity "${entityName}". Supported: ${this.listEntities().join(", ")}`,
      );
    }
    return handler;
  }

  async assertImportPermission(
    userId: number,
    entityName: string,
  ): Promise<void> {
    if (!userId || userId === -1) return;

    const hasSuperAdmin = await this.permissionsService.hasPermission(
      userId,
      "super_admin",
    );
    if (hasSuperAdmin) return;

    const hasFundRaisingManager = await this.permissionsService.hasPermission(
      userId,
      "fund_raising_manager",
    );
    if (hasFundRaisingManager) return;

    const entity = String(entityName || "").trim().toLowerCase();

    if (entity === "donors") {
      const canCreate =
        (await this.permissionsService.hasPermission(
          userId,
          "fund_raising.donors.create",
        )) ||
        (await this.permissionsService.hasPermission(
          userId,
          "fund_raising.online_donors.create",
        )) ||
        (await this.permissionsService.hasPermission(
          userId,
          "fund_raising.offline_donors.create",
        ));
      if (!canCreate) {
        throw new BadRequestException(
          "Insufficient permissions to import donors",
        );
      }
      return;
    }

    if (entity === "donation_box") {
      const canCreate = await this.permissionsService.hasPermission(
        userId,
        "fund_raising.donation_box.create",
      );
      if (!canCreate) {
        throw new BadRequestException(
          "Insufficient permissions to import donation boxes",
        );
      }
      return;
    }

    if (entity === "donation_box_donations") {
      const canCreate = await this.permissionsService.hasPermission(
        userId,
        "fund_raising.donation_box_donations.create",
      );
      if (!canCreate) {
        throw new BadRequestException(
          "Insufficient permissions to import donation box collections",
        );
      }
      return;
    }

    if (entity === "volunteers") {
      const canCreate = await this.permissionsService.hasPermission(
        userId,
        "fund_raising.volunteers.create",
      );
      if (!canCreate) {
        throw new BadRequestException(
          "Insufficient permissions to import volunteers",
        );
      }
      return;
    }

    throw new BadRequestException(
      `Import permission not configured for entity "${entityName}"`,
    );
  }

  async importCsvFile(
    entityName: string,
    file: Express.Multer.File,
    user: any,
    options?: { year?: number },
  ): Promise<ImportBatchResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("CSV file is required");
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException("File exceeds maximum size of 5MB");
    }

    const handler = this.getHandler(entityName);
    const { headers, rows } = parseCsvBuffer(file.buffer);

    if (headers.length === 0) {
      throw new BadRequestException("CSV file has no header row");
    }

    const required = handler.getRequiredHeaders();
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required columns: ${missing.join(", ")}`,
      );
    }

    if (rows.length === 0) {
      throw new BadRequestException("CSV file has no data rows");
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Maximum ${MAX_IMPORT_ROWS} rows per import (file has ${rows.length})`,
      );
    }

    if (user?.id) {
      await this.assertImportPermission(user.id, entityName);
    }

    return handler.importRows(rows, user, options);
  }
}
