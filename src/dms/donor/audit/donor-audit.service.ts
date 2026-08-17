import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonorAuditLog } from "./entities/donor-audit-log.entity";
import { LogDonorAuditParams } from "./donor-audit.types";

export type DonorAuditHistoryEntry = {
  id: number;
  donor_id: number | null;
  action: string;
  source: string;
  changes: LogDonorAuditParams["changes"];
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
export class DonorAuditService {
  private readonly logger = new Logger(DonorAuditService.name);

  constructor(
    @InjectRepository(DonorAuditLog)
    private readonly auditRepo: Repository<DonorAuditLog>,
  ) {}

  async log(params: LogDonorAuditParams): Promise<void> {
    if (!params.changes?.length) return;
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          donor_id: params.donorId,
          action: params.action,
          source: params.source,
          changes: params.changes,
          performed_by_id: params.performedByUserId ?? null,
          metadata: params.metadata ?? null,
        }),
      );
    } catch (err: any) {
      this.logger.warn(
        `Donor audit log failed [donor=${params.donorId}]: ${err?.message || err}`,
      );
    }
  }

  async findByDonorId(donorId: number): Promise<DonorAuditHistoryEntry[]> {
    const rows = await this.auditRepo.find({
      where: { donor_id: donorId },
      relations: ["performed_by"],
      order: { created_at: "DESC", id: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      donor_id: row.donor_id,
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
