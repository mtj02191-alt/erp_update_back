import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Donation } from "src/donations/entities/donation.entity";
import { ProgressTracker } from "src/progress_tracking/progress_trackers/progress_tracker.entity";
import { ProgressTrackersService } from "src/progress_tracking/progress_trackers/progress-trackers.service";

type DonorPortalTrackerPayload = {
  id: number;
  public_tracking_token: string | null;
  donor_visible: boolean;
  template: { id: number; name: string; code: string } | null;
  steps: Array<{
    id: number;
    step_order: number;
    step_key: string;
    title: string;
    status: string;
    notes: string | null;
    completed_at: Date | null;
    batch_id: number | null;
    batch: {
      id: number;
      batch_number: number;
      tag_number: string | null;
      tag_name: string | null;
    } | null;
    evidence: any[];
  }>;
};

@Injectable()
export class DonorPortalDonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationsRepo: Repository<Donation>,
    @InjectRepository(ProgressTracker)
    private readonly trackersRepo: Repository<ProgressTracker>,
    private readonly progressTrackersService: ProgressTrackersService,
  ) {}

  private stripDonorSecrets(donation: Donation): void {
    const donor = (donation as any)?.donor;
    if (donor && typeof donor === "object") {
      delete (donor as any).password;
      delete (donor as any).password_enc;
    }
  }

  /** Donation must belong to donor and not be in-kind. */
  private async assertDonorDonation(
    donorId: number,
    donationId: number,
  ): Promise<Donation> {
    const donation = await this.donationsRepo.findOne({
      where: { id: donationId, donor_id: donorId } as any,
      relations: ["donor"],
    });
    if (!donation) throw new NotFoundException("Donation not found");
    if (String(donation.donation_method || "").toLowerCase() === "in_kind") {
      throw new NotFoundException("Donation not found");
    }
    this.stripDonorSecrets(donation);
    return donation;
  }

  /**
   * Full donor-safe tracker payloads: template, steps with batch + evidence.
   * Only trackers with donor_visible and steps with donor_visible.
   */
  private async buildDonorPortalTrackersPayload(
    donationId: number,
  ): Promise<DonorPortalTrackerPayload[]> {
    const fullTrackers =
      await this.progressTrackersService.getAllTrackersByDonationId(
        donationId,
      );
    const donorVisibleTrackers = (fullTrackers || []).filter(
      (tr: any) => tr?.donor_visible === true,
    );

    return donorVisibleTrackers.map((tr: any) => ({
      id: tr.id,
      public_tracking_token: tr.public_tracking_token || null,
      donor_visible: tr.donor_visible,
      template: tr.template
        ? {
            id: tr.template.id,
            name: tr.template.name,
            code: tr.template.code,
          }
        : null,
      steps: (tr.steps || [])
        .filter((s: any) => s?.donor_visible === true && s?.is_archived !== true)
        .map((s: any) => ({
          id: s.id,
          step_order: s.step_order,
          step_key: s.step_key,
          title: s.title,
          status: s.status,
          notes: s.notes ?? null,
          completed_at: s.completed_at ?? null,
          batch_id: s.batch_id ?? null,
          batch: s.batch
            ? {
                id: s.batch.id,
                batch_number: s.batch.batch_number,
                tag_number:
                  s.batch.tag_number != null &&
                  String(s.batch.tag_number).trim() !== ""
                    ? String(s.batch.tag_number).trim()
                    : null,
                tag_name:
                  s.batch.tag_name != null &&
                  String(s.batch.tag_name).trim() !== ""
                    ? String(s.batch.tag_name).trim()
                    : null,
              }
            : null,
          evidence: (s.evidence || []).filter(
            (e: any) => e?.is_archived !== true,
          ),
        })),
    }));
  }

  async listForDonor(donorId: number) {
    const donations = await this.donationsRepo
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.donor", "donor")
      .where("d.donor_id = :donorId", { donorId })
      .andWhere("COALESCE(d.donation_method,'') != 'in_kind'")
      .orderBy("d.created_at", "DESC")
      .getMany();

    if (!donations.length) return [];

    const ids = donations.map((x) => x.id);
    const trackerRows = await this.trackersRepo.find({
      where: { donation_id: In(ids), is_archived: false } as any,
      order: { id: "ASC" } as any,
      select: [
        "id",
        "donation_id",
        "public_tracking_token",
        "donor_visible",
        "template_id",
      ] as any,
    });

    const byDonation = new Map<
      number,
      Array<{
        id: number;
        public_tracking_token: string | null;
        template_id: number;
      }>
    >();
    for (const t of trackerRows || []) {
      if ((t as any).donor_visible !== true) continue;
      const did = Number((t as any).donation_id);
      if (!Number.isFinite(did)) continue;
      const row = {
        id: Number((t as any).id),
        public_tracking_token: (t as any).public_tracking_token || null,
        template_id: Number((t as any).template_id),
      };
      const list = byDonation.get(did) || [];
      list.push(row);
      byDonation.set(did, list);
    }

    return donations.map((d) => {
      this.stripDonorSecrets(d);
      return {
        ...d,
        progress_trackers: byDonation.get(d.id) || [],
      };
    });
  }

  async getForDonor(donorId: number, donationId: number) {
    const donation = await this.assertDonorDonation(donorId, donationId);
    const progress_trackers = await this.buildDonorPortalTrackersPayload(
      donationId,
    );
    return {
      ...donation,
      progress_trackers,
    };
  }

  async getTrackingForDonation(donorId: number, donationId: number) {
    await this.assertDonorDonation(donorId, donationId);
    const trackers = await this.buildDonorPortalTrackersPayload(donationId);
    if (!trackers.length) {
      throw new NotFoundException("No tracker for this donation");
    }
    return { trackers };
  }
}
