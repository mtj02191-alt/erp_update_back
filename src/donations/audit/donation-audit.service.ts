import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonationAuditLog } from "./entities/donation-audit-log.entity";
import { LogDonationAuditParams } from "./donation-audit.types";

export type DonationAuditHistoryEntry = {
  id: number;
  donation_id: number;
  action: string;
  source: string;
  changes: LogDonationAuditParams["changes"];
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
export class DonationAuditService {
  private readonly logger = new Logger(DonationAuditService.name);

  constructor(
    @InjectRepository(DonationAuditLog)
    private readonly auditRepo: Repository<DonationAuditLog>,
  ) {}

  /**
   * Append-only audit row. Never throws — donation updates must not fail if logging fails.
   */
  async log(params: LogDonationAuditParams): Promise<void> {
    if (!params.changes?.length) return;

    try {
      const row = this.auditRepo.create({
        donation_id: params.donationId,
        action: params.action,
        source: params.source,
        changes: params.changes,
        performed_by_id: params.performedByUserId ?? null,
        metadata: params.metadata ?? null,
      });
      await this.auditRepo.save(row);
    } catch (err: any) {
      this.logger.warn(
        `Donation audit log failed [donation=${params.donationId}, action=${params.action}]: ${err?.message || err}`,
      );
    }
  }

  async findByDonationId(donationId: number): Promise<DonationAuditHistoryEntry[]> {
    const rows = await this.auditRepo.find({
      where: { donation_id: donationId },
      relations: ["performed_by"],
      order: { created_at: "DESC", id: "DESC" },
    });

    return rows.map((row) => ({
      id: row.id,
      donation_id: row.donation_id,
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
