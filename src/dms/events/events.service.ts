import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, In, Between } from "typeorm";
import * as crypto from "crypto";
import { Event, EventStatus } from "./entities/event.entity";
import { EventPass, EventPassStatus } from "./entities/event_pass.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventFiltersDto } from "./dto/event-filters.dto";
import { ScanPassDto } from "./dto/scan-pass.dto";
import { PassesQueryDto } from "./dto/passes-query.dto";

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(EventPass)
    private passRepo: Repository<EventPass>,
    @InjectRepository(Donation)
    private donationRepo: Repository<Donation>,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: number,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const existing = await this.eventRepo.findOne({
        where: {
          slug: uniqueSlug,
          ...(excludeId ? { id: Not(excludeId) } : {}),
        },
      });
      if (!existing) return uniqueSlug;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  private validateDateRange(start_at: Date, end_at: Date): void {
    if (start_at >= end_at) {
      throw new BadRequestException("start_at must be before end_at");
    }
  }

  private generatePassCode(): string {
    return crypto.randomUUID().replace(/-/g, "");
  }

  async create(dto: CreateEventDto, createdBy: number | null): Promise<Event> {
    const startAt = new Date(dto.start_at);
    const endAt = new Date(dto.end_at);
    this.validateDateRange(startAt, endAt);

    let slug = dto.slug?.trim() || this.generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(slug);

    const event = this.eventRepo.create({
      title: dto.title,
      slug,
      description: dto.description ?? null,
      status: dto.status ?? EventStatus.DRAFT,
      event_type: dto.event_type ?? null,
      start_at: startAt,
      end_at: endAt,
      location: dto.location ?? null,
      campaign_id: dto.campaign_id ?? null,
      is_public: dto.is_public ?? true,
      allowed_attendees: dto.allowed_attendees ?? 0,
      attendees_count: 0,
      created_by: createdBy != null ? ({ id: createdBy } as any) : undefined,
    });
    return this.eventRepo.save(event);
  }

  async findAll(filters?: EventFiltersDto): Promise<Event[]> {
    const qb = this.eventRepo
      .createQueryBuilder("e")
      .orderBy("e.created_at", "DESC");
    if (filters?.status)
      qb.andWhere("e.status = :status", { status: filters.status });
    if (filters?.campaign_id != null)
      qb.andWhere("e.campaign_id = :cid", { cid: filters.campaign_id });
    if (filters?.search?.trim()) {
      qb.andWhere("(e.title ILIKE :search OR e.description ILIKE :search)", {
        search: `%${filters.search.trim()}%`,
      });
    }
    if (filters?.from)
      qb.andWhere("e.start_at >= :from", { from: filters.from });
    if (filters?.to) qb.andWhere("e.end_at <= :to", { to: filters.to });
    return qb.getMany();
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException(`Event #${id} not found`);
    return event;
  }

  async findBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { slug } });
    if (!event)
      throw new NotFoundException(`Event with slug '${slug}' not found`);
    return event;
  }

  async findByIdOrSlug(identifier: string | number): Promise<Event> {
    const id = Number(identifier);
    if (!Number.isNaN(id)) return this.findOne(id);
    return this.findBySlug(String(identifier));
  }

  async getDetailWithRemaining(
    id: number,
  ): Promise<Event & { remaining: number }> {
    const event = await this.findOne(id);
    const remaining = Math.max(
      0,
      event.allowed_attendees - event.attendees_count,
    );
    return { ...event, remaining };
  }

  async update(
    id: number,
    dto: UpdateEventDto,
    updatedBy: number | null,
  ): Promise<Event> {
    const event = await this.findOne(id);
    if (dto.start_at !== undefined) event.start_at = new Date(dto.start_at);
    if (dto.end_at !== undefined) event.end_at = new Date(dto.end_at);
    this.validateDateRange(event.start_at, event.end_at);
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.status !== undefined) event.status = dto.status;
    if (dto.event_type !== undefined) event.event_type = dto.event_type;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.campaign_id !== undefined) event.campaign_id = dto.campaign_id;
    if (dto.is_public !== undefined) event.is_public = dto.is_public;
    if (dto.allowed_attendees !== undefined)
      event.allowed_attendees = dto.allowed_attendees;
    if (dto.slug !== undefined && dto.slug !== event.slug) {
      event.slug = await this.ensureUniqueSlug(dto.slug, id);
    }
    event.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.eventRepo.save(event);
  }

  async setStatus(
    id: number,
    status: EventStatus,
    updatedBy: number | null,
  ): Promise<Event> {
    const event = await this.findOne(id);
    event.status = status;
    event.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.eventRepo.save(event);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    event.status = EventStatus.ARCHIVED;
    event.is_archived = true;
    await this.eventRepo.save(event);
  }

  async getPublicEvents(): Promise<Event[]> {
    return this.eventRepo.find({
      where: {
        is_public: true,
        status: In([EventStatus.UPCOMING, EventStatus.ONGOING]),
      },
      order: { start_at: "ASC" },
    });
  }

  async getPublicBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: {
        slug,
        is_public: true,
        status: In([EventStatus.UPCOMING, EventStatus.ONGOING]),
      },
    });
    if (!event)
      throw new NotFoundException(`Event with slug '${slug}' not found`);
    return event;
  }

  // —— Passes ——

  async generatePasses(eventId: number, count: number): Promise<EventPass[]> {
    const event = await this.findOne(eventId);
    const codes = new Set<string>();
    while (codes.size < count) codes.add(this.generatePassCode());
    const passes = Array.from(codes).map((pass_code) =>
      this.passRepo.create({ event_id: eventId, pass_code }),
    );
    return this.passRepo.save(passes);
  }

  async revokePass(eventId: number, passId: number): Promise<EventPass> {
    await this.findOne(eventId);
    const pass = await this.passRepo.findOne({
      where: { id: passId, event_id: eventId },
    });
    if (!pass) throw new NotFoundException(`Pass #${passId} not found`);
    pass.status = EventPassStatus.REVOKED;
    return this.passRepo.save(pass);
  }

  async listPasses(
    eventId: number,
    query: PassesQueryDto,
  ): Promise<{ data: EventPass[]; total: number }> {
    await this.findOne(eventId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.passRepo
      .createQueryBuilder("p")
      .where("p.event_id = :eventId", { eventId })
      .orderBy("p.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (query.status)
      qb.andWhere("p.status = :status", { status: query.status });
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async scanPass(
    eventId: number,
    dto: ScanPassDto,
    usedBy: number | null,
  ): Promise<
    | {
        ok: true;
        attendees_count: number;
        allowed_attendees: number;
        remaining: number;
      }
    | { ok: false; code: string; used_at?: string }
  > {
    const event = await this.findOne(eventId);
    const pass = await this.passRepo.findOne({
      where: { pass_code: dto.pass_code },
    });
    if (!pass) {
      return { ok: false, code: "INVALID_PASS" };
    }
    if (pass.event_id !== eventId) {
      return { ok: false, code: "INVALID_PASS" };
    }
    if (pass.status === EventPassStatus.REVOKED) {
      return { ok: false, code: "PASS_REVOKED" };
    }
    if (pass.status === EventPassStatus.USED) {
      return {
        ok: false,
        code: "PASS_ALREADY_USED",
        used_at: pass.used_at?.toISOString(),
      };
    }

    const queryRunner = this.eventRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const now = new Date();
      const passUpdate = await queryRunner.manager
        .createQueryBuilder()
        .update(EventPass)
        .set({
          status: EventPassStatus.USED,
          used_at: now,
          used_by: usedBy,
          device_id: dto.device_id ?? null,
        })
        .where("event_id = :eventId", { eventId })
        .andWhere("pass_code = :passCode", { passCode: dto.pass_code })
        .andWhere("status = :status", { status: EventPassStatus.UNUSED })
        .execute();

      if (passUpdate.affected === 0) {
        await queryRunner.rollbackTransaction();
        const recheck = await this.passRepo.findOne({
          where: { pass_code: dto.pass_code },
        });
        if (recheck?.status === EventPassStatus.USED) {
          return {
            ok: false,
            code: "PASS_ALREADY_USED",
            used_at: recheck.used_at?.toISOString(),
          };
        }
        if (recheck?.status === EventPassStatus.REVOKED) {
          return { ok: false, code: "PASS_REVOKED" };
        }
        return { ok: false, code: "INVALID_PASS" };
      }

      const eventUpdate = await queryRunner.manager
        .createQueryBuilder()
        .update(Event)
        .set({ attendees_count: () => "attendees_count + 1" })
        .where("id = :eventId", { eventId })
        .andWhere("attendees_count < allowed_attendees")
        .execute();

      if (eventUpdate.affected === 0) {
        await queryRunner.rollbackTransaction();
        return { ok: false, code: "EVENT_FULL" };
      }

      await queryRunner.commitTransaction();
      const updated = await this.eventRepo.findOne({ where: { id: eventId } });
      const attendees_count = updated!.attendees_count;
      const remaining = Math.max(
        0,
        updated!.allowed_attendees - attendees_count,
      );
      return {
        ok: true,
        attendees_count,
        allowed_attendees: updated!.allowed_attendees,
        remaining,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getStats(eventId: number): Promise<{
    allowed_attendees: number;
    attendees_count: number;
    remaining: number;
    passes_total: number;
    passes_used: number;
    passes_unused: number;
    passes_revoked: number;
  }> {
    const event = await this.findOne(eventId);
    const [total, used, unused, revoked] = await Promise.all([
      this.passRepo.count({ where: { event_id: eventId } }),
      this.passRepo.count({
        where: { event_id: eventId, status: EventPassStatus.USED },
      }),
      this.passRepo.count({
        where: { event_id: eventId, status: EventPassStatus.UNUSED },
      }),
      this.passRepo.count({
        where: { event_id: eventId, status: EventPassStatus.REVOKED },
      }),
    ]);
    return {
      allowed_attendees: event.allowed_attendees,
      attendees_count: event.attendees_count,
      remaining: Math.max(0, event.allowed_attendees - event.attendees_count),
      passes_total: total,
      passes_used: used,
      passes_unused: unused,
      passes_revoked: revoked,
    };
  }

  async getDonationsReport(
    eventId: number,
    from?: string,
    to?: string,
  ): Promise<{
    total_amount: number;
    total_donations: number;
    unique_donors: number;
    daily_totals: { date: string; amount: number; count: number }[];
  }> {
    await this.findOne(eventId);
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();
    const donations = await this.donationRepo.find({
      where: {
        event_id: eventId,
        status: In(["paid", "completed"]),
        date: Between(fromDate, toDate),
      },
      select: ["amount", "paid_amount", "donor_id", "date"],
    });
    const amountField = (d: Donation) => Number(d.paid_amount ?? d.amount ?? 0);
    const totalAmount = donations.reduce((sum, d) => sum + amountField(d), 0);
    const totalDonations = donations.length;
    const uniqueDonors = new Set(
      donations.map((d) => d.donor_id).filter(Boolean),
    ).size;
    const byDate = new Map<string, { amount: number; count: number }>();
    for (const d of donations) {
      const dateStr = d.date
        ? new Date(d.date).toISOString().split("T")[0]
        : "unknown";
      const existing = byDate.get(dateStr) || { amount: 0, count: 0 };
      existing.amount += amountField(d);
      existing.count += 1;
      byDate.set(dateStr, existing);
    }
    const daily_totals = Array.from(byDate.entries())
      .map(([date, { amount, count }]) => ({ date, amount, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      total_amount: Math.round(totalAmount * 100) / 100,
      total_donations: totalDonations,
      unique_donors: uniqueDonors,
      daily_totals: daily_totals.map((dt) => ({
        ...dt,
        amount: Math.round(dt.amount * 100) / 100,
      })),
    };
  }
}
