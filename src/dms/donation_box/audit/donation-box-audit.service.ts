import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonationBoxAuditLog } from "./entities/donation-box-audit-log.entity";
import { LogDonationBoxAuditParams } from "./donation-box-audit.types";

export type DonationBoxAuditHistoryEntry = {
  id: number;
  donation_box_id: number | null;
  action: string;
  source: string;
  changes: LogDonationBoxAuditParams["changes"];
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
export class DonationBoxAuditService {
  private readonly logger = new Logger(DonationBoxAuditService.name);

  constructor(
    @InjectRepository(DonationBoxAuditLog)
    private readonly auditRepo: Repository<DonationBoxAuditLog>,
  ) {}

  async log(params: LogDonationBoxAuditParams): Promise<void> {
    if (!params.changes?.length) return;
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          donation_box_id: params.donationBoxId,
          action: params.action,
          source: params.source,
          changes: params.changes,
          performed_by_id: params.performedByUserId ?? null,
          metadata: params.metadata ?? null,
        }),
      );
    } catch (err: any) {
      this.logger.warn(
        `Donation box audit failed [box=${params.donationBoxId}]: ${err?.message || err}`,
      );
    }
  }

  async findByDonationBoxId(
    donationBoxId: number,
  ): Promise<DonationBoxAuditHistoryEntry[]> {
    const rows = await this.auditRepo.find({
      where: { donation_box_id: donationBoxId },
      relations: ["performed_by"],
      order: { created_at: "DESC", id: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      donation_box_id: row.donation_box_id,
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
