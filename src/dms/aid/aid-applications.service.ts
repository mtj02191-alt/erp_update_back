import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { User } from "../../users/user.entity";
import { S3StorageService } from "../../utils/storage/s3-storage.service";
import {
  AidApplicationStatus,
  AidAttachmentContext,
  AidCeoApprovalStatus,
  AidDeliveryStatus,
  AidRequestType,
  AidWriterRelation,
} from "./aid.enums";
import {
  AID_COOLDOWN_DAYS,
  AID_SUCCESS_STATUSES,
} from "./aid-leakage.constants";
import {
  AID_VERIFICATION_CHECKLIST_ITEMS,
} from "./aid-verification-checklist";
import { AidPeopleService } from "./aid-people.service";
import {
  CeoDecideAidApplicationDto,
  CreateAidApplicationDto,
  DeliverAidApplicationDto,
  RejectAidApplicationDto,
  UpdateAidApplicationDto,
  VerifyAidApplicationDto,
} from "./dto/aid.dto";
import { AidApplication } from "./entities/aid-application.entity";
import { AidAttachment } from "./entities/aid-attachment.entity";
import { AidHouseholdMember } from "./entities/aid-household-member.entity";
import { AidPerson } from "./entities/aid-person.entity";

@Injectable()
export class AidApplicationsService {
  constructor(
    @InjectRepository(AidApplication)
    private readonly appRepo: Repository<AidApplication>,
    @InjectRepository(AidAttachment)
    private readonly attachmentRepo: Repository<AidAttachment>,
    @InjectRepository(AidPerson)
    private readonly personRepo: Repository<AidPerson>,
    @InjectRepository(AidHouseholdMember)
    private readonly memberRepo: Repository<AidHouseholdMember>,
    private readonly peopleService: AidPeopleService,
    private readonly s3: S3StorageService,
  ) {}

  private async nextApplicationNo(): Promise<string> {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `AID-${day}-`;
    const latest = await this.appRepo
      .createQueryBuilder("a")
      .where("a.application_no LIKE :prefix", { prefix: `${prefix}%` })
      .orderBy("a.application_no", "DESC")
      .getOne();
    let seq = 1;
    if (latest?.application_no) {
      const part = latest.application_no.split("-").pop();
      const n = Number(part);
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  async create(dto: CreateAidApplicationDto, user?: User) {
    let beneficiaryId = dto.beneficiary_person_id;
    let writerId = dto.writer_person_id;

    if (dto.beneficiary && !beneficiaryId) {
      const b = await this.peopleService.create(dto.beneficiary, user);
      beneficiaryId = b.id;
    }
    if (dto.writer && !writerId) {
      const w = await this.peopleService.create(dto.writer, user);
      writerId = w.id;
    }
    if (!beneficiaryId) {
      throw new BadRequestException("beneficiary_person_id is required");
    }
    if (!writerId) {
      writerId = beneficiaryId;
    }

    await this.peopleService.findOne(beneficiaryId);
    await this.peopleService.findOne(writerId);

    const writerRelation =
      writerId === beneficiaryId
        ? AidWriterRelation.SELF
        : dto.writer_relation || AidWriterRelation.OTHER;

    const row = this.appRepo.create({
      application_no: await this.nextApplicationNo(),
      beneficiary_person_id: beneficiaryId,
      writer_person_id: writerId,
      writer_relation: writerRelation,
      household_id: dto.household_id ?? null,
      title: dto.title?.trim() || null,
      request_summary: dto.request_summary?.trim() || null,
      requested_aid_type: dto.requested_aid_type || AidRequestType.OTHER,
      status: AidApplicationStatus.SUBMITTED,
      ceo_approval_status: AidCeoApprovalStatus.NOT_REQUIRED,
      delivery_status: AidDeliveryStatus.NOT_STARTED,
      assigned_to_user_id: dto.assigned_to_user_id ?? null,
      submitted_at: new Date(),
      created_by: user || null,
      updated_by: user || null,
    });
    const saved = await this.appRepo.save(row);

    for (const fm of dto.family_members || []) {
      if (!fm?.relation_type) continue;
      const hasPerson =
        fm.existing_person_id ||
        (fm.person && String(fm.person.full_name || "").trim());
      if (!hasPerson) continue;
      try {
        await this.peopleService.addFamilyMember(beneficiaryId, fm, user);
      } catch (err) {
        if (err instanceof ConflictException) continue;
        throw err;
      }
    }

    return this.findOne(saved.id);
  }

  async findAll(params: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const qb = this.appRepo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.beneficiary", "beneficiary")
      .leftJoinAndSelect("a.writer", "writer")
      .leftJoinAndSelect("a.assigned_to", "assigned_to")
      .where("a.is_archived = :archived", { archived: false })
      .orderBy("a.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (params.status) {
      qb.andWhere("a.status = :status", { status: params.status });
    }
    const search = String(params.search || "").trim();
    if (search) {
      qb.andWhere(
        "(a.application_no ILIKE :q OR a.title ILIKE :q OR beneficiary.full_name ILIKE :q OR beneficiary.cnic ILIKE :q)",
        { q: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: number) {
    const app = await this.appRepo.findOne({
      where: { id, is_archived: false },
      relations: [
        "beneficiary",
        "writer",
        "household",
        "assigned_to",
        "verified_by",
        "ceo_decided_by",
        "delivered_by",
        "leakage_override_by",
      ],
    });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    const attachments = await this.attachmentRepo.find({
      where: { application_id: id, is_archived: false },
      relations: ["uploaded_by"],
      order: { created_at: "DESC" },
    });
    const duplicate_flags = await this.buildDuplicateFlags(app);
    const aid_history = await this.buildAidHistory(app);
    return {
      ...app,
      attachments,
      duplicate_flags,
      aid_history,
      verification_checklist_items: AID_VERIFICATION_CHECKLIST_ITEMS,
    };
  }

  private normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    return digits.length >= 7 ? digits : null;
  }

  private normalizeAddress(address?: string | null): string | null {
    if (!address) return null;
    const cleaned = String(address).trim().toLowerCase().replace(/\s+/g, " ");
    return cleaned.length >= 8 ? cleaned : null;
  }

  private async buildDuplicateFlags(app: AidApplication) {
    const beneficiary =
      app.beneficiary ||
      (await this.peopleService.findOne(app.beneficiary_person_id));

    const phone = this.normalizePhone(beneficiary.phone);
    const address = this.normalizeAddress(beneficiary.address);
    const cnic = beneficiary.cnic ? String(beneficiary.cnic).replace(/\D/g, "") : null;

    const phone_matches: AidPerson[] = [];
    const address_matches: AidPerson[] = [];
    const cnic_matches: AidPerson[] = [];

    if (phone) {
      const rows = await this.personRepo
        .createQueryBuilder("p")
        .where("p.is_archived = false")
        .andWhere("p.id != :id", { id: beneficiary.id })
        .andWhere(
          "regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') = :phone",
          { phone },
        )
        .take(20)
        .getMany();
      phone_matches.push(...rows);
    }

    if (cnic) {
      const rows = await this.personRepo.find({
        where: { cnic, is_archived: false, id: Not(beneficiary.id) },
        take: 20,
      });
      cnic_matches.push(...rows);
    }

    if (address) {
      const rows = await this.personRepo
        .createQueryBuilder("p")
        .where("p.is_archived = false")
        .andWhere("p.id != :id", { id: beneficiary.id })
        .andWhere("p.address IS NOT NULL")
        .andWhere(
          "LOWER(REGEXP_REPLACE(p.address, '\\s+', ' ', 'g')) LIKE :addr",
          { addr: `%${address.slice(0, 40)}%` },
        )
        .take(20)
        .getMany();
      address_matches.push(...rows);
    }

    const relatedPersonIds = new Set<number>([
      beneficiary.id,
      ...phone_matches.map((p) => p.id),
      ...address_matches.map((p) => p.id),
      ...cnic_matches.map((p) => p.id),
    ]);

    const prior_applications = await this.appRepo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.beneficiary", "beneficiary")
      .where("a.is_archived = false")
      .andWhere("a.id != :appId", { appId: app.id })
      .andWhere("a.beneficiary_person_id IN (:...pids)", {
        pids: [...relatedPersonIds],
      })
      .orderBy("a.created_at", "DESC")
      .take(30)
      .getMany();

    const has_flags =
      phone_matches.length > 0 ||
      address_matches.length > 0 ||
      cnic_matches.length > 0 ||
      prior_applications.length > 0;

    return {
      has_flags,
      phone_matches: phone_matches.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        cnic: p.cnic,
        phone: p.phone,
        address: p.address,
        city: p.city,
        match_on: "phone",
      })),
      cnic_matches: cnic_matches.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        cnic: p.cnic,
        phone: p.phone,
        address: p.address,
        city: p.city,
        match_on: "cnic",
      })),
      address_matches: address_matches.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        cnic: p.cnic,
        phone: p.phone,
        address: p.address,
        city: p.city,
        match_on: "address",
      })),
      prior_applications: prior_applications.map((a) => ({
        id: a.id,
        application_no: a.application_no,
        status: a.status,
        requested_aid_type: a.requested_aid_type,
        beneficiary_person_id: a.beneficiary_person_id,
        beneficiary_name: a.beneficiary?.full_name || null,
        submitted_at: a.submitted_at,
      })),
    };
  }

  private successReferenceDate(a: AidApplication): Date {
    if (a.delivered_at) return new Date(a.delivered_at);
    if (a.ceo_decided_at) return new Date(a.ceo_decided_at);
    if (a.verified_at) return new Date(a.verified_at);
    if (a.submitted_at) return new Date(a.submitted_at);
    return a.created_at ? new Date(a.created_at) : new Date();
  }

  private mapHistoryRow(a: AidApplication, scope: "person" | "household") {
    return {
      id: a.id,
      application_no: a.application_no,
      status: a.status,
      requested_aid_type: a.requested_aid_type,
      beneficiary_person_id: a.beneficiary_person_id,
      beneficiary_name: a.beneficiary?.full_name || null,
      household_id: a.household_id,
      reference_at: this.successReferenceDate(a).toISOString(),
      scope,
    };
  }

  private async resolveHouseholdPersonIds(
    beneficiaryId: number,
    householdId?: number | null,
  ): Promise<number[]> {
    const ids = new Set<number>([beneficiaryId]);
    const memberships = await this.memberRepo.find({
      where: { person_id: beneficiaryId, is_archived: false },
    });
    const householdIds = new Set<number>(
      memberships.map((m) => m.household_id).filter(Boolean),
    );
    if (householdId) householdIds.add(householdId);

    for (const hid of householdIds) {
      const mates = await this.memberRepo.find({
        where: { household_id: hid, is_archived: false },
      });
      for (const m of mates) ids.add(m.person_id);
    }
    return [...ids];
  }

  private async buildAidHistory(app: AidApplication) {
    const beneficiaryId = app.beneficiary_person_id;
    const householdPersonIds = await this.resolveHouseholdPersonIds(
      beneficiaryId,
      app.household_id,
    );

    const successApps = await this.appRepo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.beneficiary", "beneficiary")
      .where("a.is_archived = false")
      .andWhere("a.id != :appId", { appId: app.id })
      .andWhere("a.status IN (:...statuses)", { statuses: AID_SUCCESS_STATUSES })
      .andWhere("a.beneficiary_person_id IN (:...pids)", {
        pids: householdPersonIds,
      })
      .orderBy("a.created_at", "DESC")
      .take(50)
      .getMany();

    const person_successful = successApps
      .filter((a) => a.beneficiary_person_id === beneficiaryId)
      .map((a) => this.mapHistoryRow(a, "person"));

    const household_successful = successApps
      .filter((a) => a.beneficiary_person_id !== beneficiaryId)
      .map((a) => this.mapHistoryRow(a, "household"));

    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);

    const thisYearHits = successApps.filter(
      (a) => this.successReferenceDate(a) >= yearStart,
    );

    const already_received_this_year_person = thisYearHits.some(
      (a) => a.beneficiary_person_id === beneficiaryId,
    );
    const already_received_this_year_household = thisYearHits.length > 0;

    let lastSuccess: AidApplication | null = null;
    for (const a of successApps) {
      if (!lastSuccess) {
        lastSuccess = a;
        continue;
      }
      if (this.successReferenceDate(a) > this.successReferenceDate(lastSuccess)) {
        lastSuccess = a;
      }
    }

    let days_since_last_success: number | null = null;
    let cooldown_ends_at: string | null = null;
    let within_cooldown = false;
    if (lastSuccess) {
      const ref = this.successReferenceDate(lastSuccess);
      const ms = Date.now() - ref.getTime();
      days_since_last_success = Math.floor(ms / (24 * 60 * 60 * 1000));
      const ends = new Date(ref);
      ends.setDate(ends.getDate() + AID_COOLDOWN_DAYS);
      cooldown_ends_at = ends.toISOString();
      within_cooldown = days_since_last_success < AID_COOLDOWN_DAYS;
    }

    const already_received_this_year = already_received_this_year_household;
    const requires_override =
      already_received_this_year || within_cooldown;
    const override_recorded = !!(
      app.leakage_override_reason &&
      String(app.leakage_override_reason).trim().length >= 5
    );

    const reasons: string[] = [];
    if (already_received_this_year_person) {
      reasons.push("Beneficiary already received successful aid this calendar year");
    } else if (already_received_this_year_household) {
      reasons.push(
        "A household member already received successful aid this calendar year",
      );
    }
    if (within_cooldown && lastSuccess) {
      reasons.push(
        `Within ${AID_COOLDOWN_DAYS}-day cooldown since ${lastSuccess.application_no} (${days_since_last_success} days ago)`,
      );
    }

    return {
      cooldown_days: AID_COOLDOWN_DAYS,
      calendar_year: year,
      already_received_this_year,
      already_received_this_year_person,
      already_received_this_year_household,
      within_cooldown,
      days_since_last_success,
      cooldown_ends_at,
      requires_override,
      override_recorded,
      reasons,
      person_successful,
      household_successful,
      household_person_ids: householdPersonIds,
    };
  }

  private async assertLeakageOverrideAllowed(
    app: AidApplication,
    overrideReason?: string | null,
    user?: User,
  ) {
    const history = await this.buildAidHistory(app);
    if (!history.requires_override) {
      return history;
    }
    if (history.override_recorded) {
      return history;
    }
    const reason = String(overrideReason || "").trim();
    if (reason.length < 5) {
      throw new BadRequestException(
        `Leakage override required: ${history.reasons.join("; ")}. Provide leakage_override_reason (min 5 chars).`,
      );
    }
    app.leakage_override_reason = reason;
    app.leakage_override_at = new Date();
    app.leakage_override_by_id = user?.id ?? null;
    return history;
  }

  private assertChecklistComplete(checklist: Record<string, boolean> | null | undefined) {
    if (!checklist || typeof checklist !== "object") {
      throw new BadRequestException("verification_checklist is required");
    }
    const missing = AID_VERIFICATION_CHECKLIST_ITEMS.filter(
      (item) => item.required && checklist[item.key] !== true,
    ).map((item) => item.label);
    if (missing.length) {
      throw new BadRequestException(
        `Complete all required checklist items before verify: ${missing.join("; ")}`,
      );
    }
  }

  async update(id: number, dto: UpdateAidApplicationDto, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    if (
      app.status === AidApplicationStatus.REJECTED ||
      app.status === AidApplicationStatus.DELIVERED
    ) {
      throw new BadRequestException("Cannot edit a closed application");
    }
    if (dto.household_id !== undefined) app.household_id = dto.household_id;
    if (dto.writer_relation !== undefined) app.writer_relation = dto.writer_relation;
    if (dto.title !== undefined) app.title = dto.title?.trim() || null;
    if (dto.request_summary !== undefined) {
      app.request_summary = dto.request_summary?.trim() || null;
    }
    if (dto.requested_aid_type !== undefined) {
      app.requested_aid_type = dto.requested_aid_type;
    }
    if (dto.assigned_to_user_id !== undefined) {
      app.assigned_to_user_id = dto.assigned_to_user_id;
    }
    if (dto.verification_notes !== undefined) {
      app.verification_notes = dto.verification_notes?.trim() || null;
    }
    if (app.status === AidApplicationStatus.SUBMITTED) {
      app.status = AidApplicationStatus.UNDER_REVIEW;
    }
    app.updated_by = user || null;
    await this.appRepo.save(app);
    return this.findOne(id);
  }

  async reject(id: number, dto: RejectAidApplicationDto, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    if (app.status === AidApplicationStatus.SUCCESSFUL || app.status === AidApplicationStatus.DELIVERED) {
      throw new BadRequestException("Cannot reject after success");
    }
    const reason = String(dto.rejection_reason || "").trim();
    if (reason.length < 2) {
      throw new BadRequestException("rejection_reason is required");
    }
    app.status = AidApplicationStatus.REJECTED;
    app.rejection_reason = reason;
    app.updated_by = user || null;
    await this.appRepo.save(app);
    return this.findOne(id);
  }

  async markVerified(id: number, dto: VerifyAidApplicationDto, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    if (
      ![
        AidApplicationStatus.SUBMITTED,
        AidApplicationStatus.UNDER_REVIEW,
      ].includes(app.status)
    ) {
      throw new BadRequestException(
        "Only submitted/under_review applications can be verified",
      );
    }
    this.assertChecklistComplete(dto.verification_checklist);
    await this.assertLeakageOverrideAllowed(app, dto.leakage_override_reason, user);

    const checklistPayload: Record<string, boolean> = {};
    for (const item of AID_VERIFICATION_CHECKLIST_ITEMS) {
      checklistPayload[item.key] = dto.verification_checklist[item.key] === true;
    }

    app.status = AidApplicationStatus.CEO_APPROVAL_REQUIRED;
    app.ceo_approval_status = AidCeoApprovalStatus.PENDING;
    app.verification_notes = dto.verification_notes?.trim() || app.verification_notes;
    app.verification_checklist = checklistPayload;
    app.verified_at = new Date();
    app.verified_by_id = user?.id ?? null;
    app.updated_by = user || null;
    await this.appRepo.save(app);
    return this.findOne(id);
  }

  async ceoDecide(id: number, dto: CeoDecideAidApplicationDto, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    if (app.status !== AidApplicationStatus.CEO_APPROVAL_REQUIRED) {
      throw new BadRequestException("Application is not awaiting CEO approval");
    }
    if (
      dto.decision !== AidCeoApprovalStatus.APPROVED &&
      dto.decision !== AidCeoApprovalStatus.REJECTED
    ) {
      throw new BadRequestException("decision must be approved or rejected");
    }

    if (dto.decision === AidCeoApprovalStatus.APPROVED) {
      await this.assertLeakageOverrideAllowed(app, dto.leakage_override_reason, user);
    }

    app.ceo_decided_at = new Date();
    app.ceo_decided_by_id = user?.id ?? null;
    app.updated_by = user || null;

    if (dto.decision === AidCeoApprovalStatus.APPROVED) {
      app.ceo_approval_status = AidCeoApprovalStatus.APPROVED;
      app.status = AidApplicationStatus.SUCCESSFUL;
      app.delivery_status = AidDeliveryStatus.PENDING;
    } else {
      const reason = String(dto.ceo_rejection_reason || "").trim();
      if (reason.length < 2) {
        throw new BadRequestException("ceo_rejection_reason is required");
      }
      app.ceo_approval_status = AidCeoApprovalStatus.REJECTED;
      app.ceo_rejection_reason = reason;
      app.status = AidApplicationStatus.REJECTED;
      app.rejection_reason = reason;
    }
    await this.appRepo.save(app);
    return this.findOne(id);
  }

  async markDelivery(id: number, dto: DeliverAidApplicationDto, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    if (
      app.status !== AidApplicationStatus.SUCCESSFUL &&
      app.status !== AidApplicationStatus.DELIVERED
    ) {
      throw new BadRequestException(
        "Delivery can only be updated after CEO approval (successful)",
      );
    }
    app.delivery_status = dto.delivery_status;
    app.delivery_notes = dto.delivery_notes?.trim() || app.delivery_notes;
    app.updated_by = user || null;
    if (
      dto.delivery_status === AidDeliveryStatus.DELIVERED ||
      dto.delivery_status === AidDeliveryStatus.PARTIAL
    ) {
      app.delivered_at = new Date();
      app.delivered_by_id = user?.id ?? null;
    }
    if (dto.delivery_status === AidDeliveryStatus.DELIVERED) {
      app.status = AidApplicationStatus.DELIVERED;
    }
    await this.appRepo.save(app);
    return this.findOne(id);
  }

  async softDelete(id: number, user?: User) {
    const app = await this.appRepo.findOne({ where: { id, is_archived: false } });
    if (!app) throw new NotFoundException(`Application #${id} not found`);
    app.is_archived = true;
    app.updated_by = user || null;
    return this.appRepo.save(app);
  }

  async addAttachment(params: {
    applicationId?: number | null;
    personId?: number | null;
    context: AidAttachmentContext;
    file: Express.Multer.File;
    description?: string | null;
    user?: User;
  }) {
    if (!params.applicationId && !params.personId) {
      throw new BadRequestException("application_id or person_id is required");
    }
    if (params.applicationId) {
      const exists = await this.appRepo.findOne({
        where: { id: params.applicationId, is_archived: false },
        select: ["id"],
      });
      if (!exists) {
        throw new NotFoundException(
          `Application #${params.applicationId} not found`,
        );
      }
    }
    if (params.personId) {
      await this.peopleService.findOne(params.personId);
    }

    const uploaded = await this.s3.uploadAidAttachment(
      params.file,
      params.context,
    );
    const row = this.attachmentRepo.create({
      application_id: params.applicationId ?? null,
      person_id: params.personId ?? null,
      context: params.context,
      file_name: params.file.originalname,
      file_url: uploaded.url,
      file_type: params.file.mimetype || null,
      description: params.description?.trim() || null,
      uploaded_by: params.user || null,
      created_by: params.user || null,
      updated_by: params.user || null,
    });
    return this.attachmentRepo.save(row);
  }

  async deleteAttachment(attachmentId: number, user?: User) {
    const row = await this.attachmentRepo.findOne({
      where: { id: attachmentId, is_archived: false },
    });
    if (!row) throw new NotFoundException(`Attachment #${attachmentId} not found`);
    row.is_archived = true;
    row.updated_by = user || null;
    return this.attachmentRepo.save(row);
  }

  async listPersonAttachments(personId: number) {
    await this.peopleService.findOne(personId);
    return this.attachmentRepo.find({
      where: { person_id: personId, is_archived: false },
      relations: ["uploaded_by"],
      order: { created_at: "DESC" },
    });
  }
}
