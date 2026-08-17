import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ManualRecurringPledge } from "./entities/manual-recurring-pledge.entity";
import { ManualRecurringPledgeLine } from "./entities/manual-recurring-pledge-line.entity";
import { CreateManualRecurringPledgeDto } from "./dto/create-manual-recurring-pledge.dto";
import { UpdateManualRecurringPledgeDto } from "./dto/update-manual-recurring-pledge.dto";
import { ManualRecurringPledgeFiltersDto } from "./dto/manual-recurring-filters.dto";
import { ManualRecurringPledgeLineDto } from "./dto/manual-recurring-pledge-line.dto";
import { Donor } from "../donor/entities/donor.entity";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { CampaignDonationItem } from "../campaigns/entities/campaign-donation-item.entity";
import {
  ManualRecurringFrequency,
  ManualRecurringStatus,
  PledgeMode,
} from "./utils/manual-recurring.constants";
import {
  computePeriodAmountFromLines,
  computeTotalPledgedAmount,
  resolvePrepaidPeriodKeys,
} from "./utils/manual-recurring-pledge.util";

@Injectable()
export class ManualRecurringService {
  constructor(
    @InjectRepository(ManualRecurringPledge)
    private readonly pledgeRepo: Repository<ManualRecurringPledge>,
    @InjectRepository(ManualRecurringPledgeLine)
    private readonly lineRepo: Repository<ManualRecurringPledgeLine>,
    @InjectRepository(CampaignDonationItem)
    private readonly itemRepo: Repository<CampaignDonationItem>,
    @InjectRepository(Donor)
    private readonly donorRepo: Repository<Donor>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
  ) {}

  private async assertRecurringCampaign(campaignId: number): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
    if (!campaign.is_recurring) {
      throw new BadRequestException(
        "Donor can only be enrolled on a recurring campaign",
      );
    }
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException(
        "Campaign must be active to enroll recurring donors",
      );
    }
    return campaign;
  }

  private async resolveLines(
    campaignId: number,
    lines?: ManualRecurringPledgeLineDto[],
  ): Promise<
    Array<{ campaign_item_id: number; quantity: number; campaign_item: CampaignDonationItem }>
  > {
    if (!lines?.length) {
      throw new BadRequestException(
        "At least one campaign donation item is required",
      );
    }

    const itemIds = [...new Set(lines.map((l) => l.campaign_item_id))];
    const items = await this.itemRepo.find({
      where: {
        id: In(itemIds),
        campaign_id: campaignId,
        is_archived: false,
        is_active: true,
      },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const resolved: Array<{
      campaign_item_id: number;
      quantity: number;
      campaign_item: CampaignDonationItem;
    }> = [];

    for (const line of lines) {
      const item = itemMap.get(line.campaign_item_id);
      if (!item) {
        throw new BadRequestException(
          `Campaign item #${line.campaign_item_id} is invalid or inactive`,
        );
      }
      resolved.push({
        campaign_item_id: line.campaign_item_id,
        quantity: line.quantity,
        campaign_item: item,
      });
    }

    return resolved;
  }

  private validatePledgeMode(
    pledgeMode: string,
    prepaidMonths?: number | null,
  ): void {
    if (pledgeMode === PledgeMode.PREPAID_MONTHS) {
      if (!prepaidMonths || prepaidMonths < 1) {
        throw new BadRequestException(
          "prepaid_months is required when pledge_mode is prepaid_months",
        );
      }
    }
  }

  private async saveLines(
    pledgeId: number,
    resolvedLines: Array<{
      campaign_item_id: number;
      quantity: number;
    }>,
  ): Promise<void> {
    await this.lineRepo.delete({ pledge_id: pledgeId });
    if (!resolvedLines.length) return;
    const entities = resolvedLines.map((line) =>
      this.lineRepo.create({
        pledge_id: pledgeId,
        campaign_item_id: line.campaign_item_id,
        quantity: line.quantity,
      }),
    );
    await this.lineRepo.save(entities);
  }

  async create(dto: CreateManualRecurringPledgeDto) {
    const donor = await this.donorRepo.findOne({
      where: { id: dto.donor_id, is_archived: false },
    });
    if (!donor) {
      throw new NotFoundException(`Donor ${dto.donor_id} not found`);
    }

    const campaignId =
      dto.campaign_id != null && Number(dto.campaign_id) > 0
        ? Number(dto.campaign_id)
        : null;

    let campaign: Campaign | null = null;
    if (campaignId) {
      campaign = await this.assertRecurringCampaign(campaignId);
    }

    const existingActive = campaignId
      ? await this.pledgeRepo.findOne({
          where: {
            donor_id: dto.donor_id,
            campaign_id: campaignId,
            status: ManualRecurringStatus.ACTIVE,
            is_archived: false,
          },
        })
      : await this.pledgeRepo
          .createQueryBuilder("p")
          .where("p.donor_id = :donorId", { donorId: dto.donor_id })
          .andWhere("p.campaign_id IS NULL")
          .andWhere("p.status = :status", {
            status: ManualRecurringStatus.ACTIVE,
          })
          .andWhere("p.is_archived = false")
          .getOne();

    if (existingActive) {
      throw new BadRequestException(
        campaignId
          ? "This donor is already enrolled on this recurring campaign"
          : "This donor already has an active general recurring pledge",
      );
    }

    const pledgeMode = dto.pledge_mode || PledgeMode.RECURRING_MONTHLY;
    this.validatePledgeMode(pledgeMode, dto.prepaid_months);

    const hasLines = Array.isArray(dto.lines) && dto.lines.length > 0;
    if (campaignId && !hasLines && dto.pledged_amount == null) {
      throw new BadRequestException(
        "Campaign enrollment requires lines or pledged_amount",
      );
    }
    if (!campaignId && (dto.pledged_amount == null || Number(dto.pledged_amount) <= 0)) {
      throw new BadRequestException(
        "General recurring enrollment requires pledged_amount",
      );
    }
    if (hasLines && !campaignId) {
      throw new BadRequestException(
        "campaign_id is required when pledge lines are provided",
      );
    }

    const resolvedLines = hasLines
      ? await this.resolveLines(campaignId as number, dto.lines)
      : [];
    const periodAmount = resolvedLines.length
      ? computePeriodAmountFromLines(resolvedLines)
      : Number(dto.pledged_amount) || 0;
    const pledgedAmount =
      dto.pledged_amount != null
        ? dto.pledged_amount
        : computeTotalPledgedAmount(
            periodAmount,
            pledgeMode,
            dto.prepaid_months,
          );

    const prepaidKeys = resolvePrepaidPeriodKeys(
      pledgeMode,
      dto.prepaid_months,
      dto.prepaid_start_period_key,
    );

    const pledge = this.pledgeRepo.create({
      donor_id: dto.donor_id,
      campaign_id: campaignId,
      pledged_amount: pledgedAmount,
      currency: dto.currency || campaign?.currency || "PKR",
      frequency: dto.frequency || ManualRecurringFrequency.MONTHLY,
      status: dto.status || ManualRecurringStatus.ACTIVE,
      remind_via_email: dto.remind_via_email !== false,
      remind_via_whatsapp: dto.remind_via_whatsapp !== false,
      email_template_id: dto.email_template_id ?? null,
      whatsapp_template_id: dto.whatsapp_template_id ?? null,
      notes: dto.notes ?? null,
      pledge_mode: pledgeMode,
      prepaid_months:
        pledgeMode === PledgeMode.PREPAID_MONTHS ? dto.prepaid_months : null,
      prepaid_start_period_key: prepaidKeys.start,
      prepaid_end_period_key: prepaidKeys.end,
    });

    const saved = await this.pledgeRepo.save(pledge);
    await this.saveLines(
      saved.id,
      resolvedLines.map((l) => ({
        campaign_item_id: l.campaign_item_id,
        quantity: l.quantity,
      })),
    );

    if (saved.status === ManualRecurringStatus.ACTIVE) {
      await this.donorRepo.update(donor.id, { recurring: true });
    }
    return this.findOne(saved.id);
  }

  /**
   * Website checkout enrollment. Returns existing active pledge if already enrolled
   * (does not fail the donation).
   */
  async createFromWebsiteCheckout(
    dto: CreateManualRecurringPledgeDto,
  ): Promise<ManualRecurringPledge | null> {
    const campaignId =
      dto.campaign_id != null && Number(dto.campaign_id) > 0
        ? Number(dto.campaign_id)
        : null;

    const existingActive = campaignId
      ? await this.pledgeRepo.findOne({
          where: {
            donor_id: dto.donor_id,
            campaign_id: campaignId,
            status: ManualRecurringStatus.ACTIVE,
            is_archived: false,
          },
        })
      : await this.pledgeRepo
          .createQueryBuilder("p")
          .where("p.donor_id = :donorId", { donorId: dto.donor_id })
          .andWhere("p.campaign_id IS NULL")
          .andWhere("p.status = :status", {
            status: ManualRecurringStatus.ACTIVE,
          })
          .andWhere("p.is_archived = false")
          .getOne();

    if (existingActive) {
      return this.findOne(existingActive.id);
    }
    return this.create({ ...dto, campaign_id: campaignId });
  }

  async findAll(filters: ManualRecurringPledgeFiltersDto = {}) {
    const qb = this.pledgeRepo
      .createQueryBuilder("pledge")
      .leftJoinAndSelect("pledge.donor", "donor")
      .leftJoinAndSelect("pledge.campaign", "campaign")
      .leftJoinAndSelect("pledge.lines", "lines")
      .leftJoinAndSelect("lines.campaign_item", "campaign_item")
      .where("pledge.is_archived = false");

    if (filters.status) {
      qb.andWhere("pledge.status = :status", { status: filters.status });
    }
    if (filters.donor_id) {
      qb.andWhere("pledge.donor_id = :donorId", { donorId: filters.donor_id });
    }
    if (filters.campaign_id) {
      qb.andWhere("pledge.campaign_id = :campaignId", {
        campaignId: filters.campaign_id,
      });
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      qb.andWhere(
        "(donor.name ILIKE :term OR donor.email ILIKE :term OR donor.phone ILIKE :term OR campaign.title ILIKE :term)",
        { term },
      );
    }

    const installmentStatus = String(filters.installment_status || "")
      .trim()
      .toLowerCase();
    if (installmentStatus === "pending") {
      qb.andWhere("pledge.last_thanks_period_key IS NULL");
    } else if (installmentStatus === "completed") {
      qb.andWhere("pledge.last_thanks_period_key IS NOT NULL");
    }

    const items = await qb.orderBy("pledge.created_at", "DESC").getMany();
    return items;
  }

  async findOne(id: number) {
    const pledge = await this.pledgeRepo.findOne({
      where: { id, is_archived: false },
      relations: ["donor", "campaign", "lines", "lines.campaign_item"],
    });
    if (!pledge) {
      throw new NotFoundException(`Manual recurring pledge ${id} not found`);
    }
    return pledge;
  }

  async findByDonorId(donorId: number) {
    return this.pledgeRepo.find({
      where: { donor_id: donorId, is_archived: false },
      relations: ["campaign", "lines", "lines.campaign_item"],
      order: { created_at: "DESC" },
    });
  }

  async update(id: number, dto: UpdateManualRecurringPledgeDto) {
    const pledge = await this.findOne(id);

    if (dto.donor_id && dto.donor_id !== pledge.donor_id) {
      throw new BadRequestException("donor_id cannot be changed");
    }

    if (dto.campaign_id && dto.campaign_id !== pledge.campaign_id) {
      throw new BadRequestException("campaign_id cannot be changed");
    }

    if (dto.status === ManualRecurringStatus.ACTIVE && pledge.status !== ManualRecurringStatus.ACTIVE) {
      const conflict = pledge.campaign_id
        ? await this.pledgeRepo.findOne({
            where: {
              donor_id: pledge.donor_id,
              campaign_id: pledge.campaign_id,
              status: ManualRecurringStatus.ACTIVE,
              is_archived: false,
            },
          })
        : await this.pledgeRepo
            .createQueryBuilder("p")
            .where("p.donor_id = :donorId", { donorId: pledge.donor_id })
            .andWhere("p.campaign_id IS NULL")
            .andWhere("p.status = :status", {
              status: ManualRecurringStatus.ACTIVE,
            })
            .andWhere("p.is_archived = false")
            .andWhere("p.id != :id", { id })
            .getOne();
      if (conflict && conflict.id !== id) {
        throw new BadRequestException(
          pledge.campaign_id
            ? "Donor already has an active enrollment on this campaign"
            : "Donor already has an active general recurring pledge",
        );
      }
    }

    const pledgeMode =
      dto.pledge_mode !== undefined ? dto.pledge_mode : pledge.pledge_mode;
    const prepaidMonths =
      dto.prepaid_months !== undefined
        ? dto.prepaid_months
        : pledge.prepaid_months;
    this.validatePledgeMode(pledgeMode, prepaidMonths);

    let resolvedLines:
      | Array<{
          campaign_item_id: number;
          quantity: number;
          campaign_item: CampaignDonationItem;
        }>
      | undefined;

    if (dto.lines) {
      resolvedLines = await this.resolveLines(pledge.campaign_id, dto.lines);
    }

    const linesForAmount =
      resolvedLines ||
      (pledge.lines || []).map((l) => ({
        quantity: l.quantity,
        campaign_item: l.campaign_item,
      }));

    const periodAmount = computePeriodAmountFromLines(linesForAmount);
    const pledgedAmount =
      dto.pledged_amount !== undefined
        ? dto.pledged_amount
        : dto.lines || dto.pledge_mode !== undefined || dto.prepaid_months !== undefined
          ? computeTotalPledgedAmount(periodAmount, pledgeMode, prepaidMonths)
          : pledge.pledged_amount;

    const prepaidStart =
      dto.prepaid_start_period_key !== undefined
        ? dto.prepaid_start_period_key
        : pledge.prepaid_start_period_key;
    const prepaidKeys = resolvePrepaidPeriodKeys(
      pledgeMode,
      prepaidMonths,
      prepaidStart,
    );

    Object.assign(pledge, {
      pledged_amount: pledgedAmount,
      currency: dto.currency !== undefined ? dto.currency : pledge.currency,
      frequency: dto.frequency !== undefined ? dto.frequency : pledge.frequency,
      status: dto.status !== undefined ? dto.status : pledge.status,
      remind_via_email:
        dto.remind_via_email !== undefined
          ? dto.remind_via_email
          : pledge.remind_via_email,
      remind_via_whatsapp:
        dto.remind_via_whatsapp !== undefined
          ? dto.remind_via_whatsapp
          : pledge.remind_via_whatsapp,
      email_template_id:
        dto.email_template_id !== undefined
          ? dto.email_template_id
          : pledge.email_template_id,
      whatsapp_template_id:
        dto.whatsapp_template_id !== undefined
          ? dto.whatsapp_template_id
          : pledge.whatsapp_template_id,
      notes: dto.notes !== undefined ? dto.notes : pledge.notes,
      pledge_mode: pledgeMode,
      prepaid_months:
        pledgeMode === PledgeMode.PREPAID_MONTHS ? prepaidMonths : null,
      prepaid_start_period_key: prepaidKeys.start,
      prepaid_end_period_key: prepaidKeys.end,
    });

    const saved = await this.pledgeRepo.save(pledge);

    if (resolvedLines) {
      await this.saveLines(
        saved.id,
        resolvedLines.map((l) => ({
          campaign_item_id: l.campaign_item_id,
          quantity: l.quantity,
        })),
      );
    }

    const activeCount = await this.pledgeRepo.count({
      where: {
        donor_id: saved.donor_id,
        status: ManualRecurringStatus.ACTIVE,
        is_archived: false,
      },
    });
    await this.donorRepo.update(saved.donor_id, {
      recurring: activeCount > 0,
    });

    return this.findOne(saved.id);
  }

  async remove(id: number) {
    const pledge = await this.findOne(id);
    pledge.is_archived = true;
    await this.pledgeRepo.save(pledge);

    const activeCount = await this.pledgeRepo.count({
      where: {
        donor_id: pledge.donor_id,
        status: ManualRecurringStatus.ACTIVE,
        is_archived: false,
      },
    });
    await this.donorRepo.update(pledge.donor_id, {
      recurring: activeCount > 0,
    });

    return { success: true };
  }
}
