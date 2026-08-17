import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonationBoxDonationAuditLog } from "./entities/donation-box-donation-audit-log.entity";
import { LogDonationBoxDonationAuditParams } from "./donation-box-donation-audit.types";

export type DonationBoxDonationAuditHistoryEntry = {
  id: number;
  donation_box_donation_id: number | null;
  action: string;
  source: string;
  changes: LogDonationBoxDonationAuditParams["changes"];
  performed_by_id: number | null;
  performed_by: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

@Injectable()
export class DonationBoxDonationAuditService {
  private readonly logger = new Logger(DonationBoxDonationAuditService.name);

  constructor(
    @InjectRepository(DonationBoxDonationAuditLog)
    private readonly auditRepo: Repository<DonationBoxDonationAuditLog>,
  ) {}

  async log(params: LogDonationBoxDonationAuditParams): Promise<void> {
    if (!params.changes?.length) return;

    try {
      const row = this.auditRepo.create({
        donation_box_donation_id: params.donationBoxDonationId,
        action: params.action,
        source: params.source,
        changes: params.changes,
        performed_by_id: params.performedByUserId ?? null,
        metadata: params.metadata ?? null,
      });
      await this.auditRepo.save(row);
    } catch (err: any) {
      this.logger.warn(
        `Donation box donation audit failed [id=${params.donationBoxDonationId}, action=${params.action}]: ${err?.message || err}`,
      );
    }
  }

  async findByDonationBoxDonationId(
    donationBoxDonationId: number,
  ): Promise<DonationBoxDonationAuditHistoryEntry[]> {
    const rows = await this.auditRepo.find({
      where: { donation_box_donation_id: donationBoxDonationId },
      relations: ["performed_by"],
      order: { created_at: "DESC", id: "DESC" },
    });

    return rows.map((row) => ({
      id: row.id,
      donation_box_donation_id: row.donation_box_donation_id,
      action: row.action,
      source: row.source,
      changes: row.changes ?? [],
      performed_by_id: row.performed_by_id,
      performed_by: row.performed_by
        ? {
            id: row.performed_by.id,
            email: row.performed_by.email ?? null,
            first_name: row.performed_by.first_name ?? null,
            last_name: row.performed_by.last_name ?? null,
          }
        : null,
      metadata: row.metadata,
      created_at: row.created_at,
    }));
  }
}
