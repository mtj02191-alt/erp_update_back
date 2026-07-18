import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Donor } from "./entities/donor.entity";
import {
  encryptDonorPassword,
  generateRandomPassword,
} from "src/utils/crypto/donor-password-vault";

@Injectable()
export class DonorPasswordBackfillService {
  private readonly logger = new Logger(DonorPasswordBackfillService.name);
  private ran = false;

  constructor(
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
  ) {}

  /**
   * One-time backfill, guarded by env flag.
   *
   * Enable once:
   * - DONOR_PASSWORD_BACKFILL_ONCE=true
   *
   * It is also idempotent: only affects donors where password IS NULL.
   */
  async runOnceIfEnabled(): Promise<void> {
    if (this.ran) return;
    this.ran = true;

    const enabled =
      String(process.env.DONOR_PASSWORD_BACKFILL_ONCE || "").toLowerCase() ===
      "true";
    if (!enabled) {
      this.logger.log(
        "Backfill skipped (DONOR_PASSWORD_BACKFILL_ONCE not enabled)",
      );
      return;
    }

    const batchSize = Math.max(
      1,
      Number(process.env.DONOR_PASSWORD_BACKFILL_BATCH_SIZE || 200),
    );

    this.logger.warn(
      `Donor password backfill started (batchSize=${batchSize}) — updating donors where password IS NULL`,
    );

    let updated = 0;
    let scanned = 0;

    while (true) {
      const donors = await this.donorRepository.find({
        where: {
          is_archived: false as any,
          password: IsNull(),
        } as any,
        select: ["id", "password_reveal_count"],
        take: batchSize,
        order: { id: "ASC" } as any,
      });

      if (donors.length === 0) break;
      scanned += donors.length;

      for (const donor of donors) {
        const plain = generateRandomPassword();
        const hashed = await bcrypt.hash(plain, 10);
        const enc = encryptDonorPassword(plain);

        await this.donorRepository.update(donor.id, {
          password: hashed as any,
          password_enc: enc.payload as any,
          password_enc_version: enc.version as any,
          // keep audit consistent: this password is "revealed" to ops once (available via reveal/reset endpoints)
          password_last_revealed_at: null as any,
          password_reveal_count: donor.password_reveal_count || 0,
        } as any);

        updated += 1;
      }

      this.logger.log(
        `Backfill progress: updated=${updated}, scanned=${scanned}`,
      );
    }

    this.logger.warn(`Donor password backfill complete. updated=${updated}`);
    this.logger.warn(
      "IMPORTANT: disable DONOR_PASSWORD_BACKFILL_ONCE after successful run.",
    );
  }
}
