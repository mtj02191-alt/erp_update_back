import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DonorInteraction } from "./entities/donor-interaction.entity";
import { DonorFollowup } from "./entities/donor-followup.entity";
import { Donor } from "../donor/entities/donor.entity";
import { CreateDonorInteractionDto } from "./dto/create-interaction.dto";
import { UpdateDonorInteractionDto } from "./dto/update-interaction.dto";
import { RescheduleFollowupDto } from "./dto/reschedule-followup.dto";
import { UpdateDonorFollowupDto } from "./dto/update-followup.dto";
import { PermissionsService } from "../../permissions/permissions.service";
import { DataScopeService } from "../../permissions/data-scope/data-scope.service";
import { User, UserRole } from "../../users/user.entity";

type CurrentUser = {
  id: number;
  role?: string;
  department?: string;
};

@Injectable()
export class DonorRelationshipService {
  constructor(
    @InjectRepository(DonorInteraction)
    private readonly interactionRepository: Repository<DonorInteraction>,
    @InjectRepository(DonorFollowup)
    private readonly followupRepository: Repository<DonorFollowup>,
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly permissionsService: PermissionsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async createInteraction(dto: CreateDonorInteractionDto, user: CurrentUser) {
    const donor = await this.assertDonorAccess(dto.donor_id, user);

    const activityDatetime = dto.activity_datetime
      ? new Date(dto.activity_datetime)
      : new Date();
    if (Number.isNaN(activityDatetime.getTime())) {
      throw new BadRequestException("Invalid activity_datetime");
    }

    const assignedToId =
      dto.assigned_to_user_id ?? this.getDonorAssignedUserId(donor) ?? user.id;

    const interaction = this.interactionRepository.create({
      donor_id: donor.id,
      activity_type: dto.activity_type,
      custom_activity_title: dto.custom_activity_title || null,
      assigned_to_user_id: assignedToId,
      activity_datetime: activityDatetime,
      user_action_text: dto.user_action_text,
      donor_response_text: dto.donor_response_text || null,
      donor_response_type: dto.donor_response_type || null,
      next_action_text: dto.next_action_text || null,
      next_followup_datetime: dto.next_followup_datetime
        ? new Date(dto.next_followup_datetime)
        : null,
      status: dto.status || "need_followup",
      created_by: { id: user.id } as User,
    });

    const saved = await this.interactionRepository.save(interaction);

    let followup: DonorFollowup | null = null;
    if (dto.next_followup_datetime) {
      const due = new Date(dto.next_followup_datetime);
      if (!Number.isNaN(due.getTime())) {
        followup = await this.createFollowupFromInteraction(saved, donor, due, user.id);
      }
    }

    return this.findInteractionById(saved.id, user);
  }

  async getDonorInteractions(donorId: number, user: CurrentUser) {
    await this.assertDonorAccess(donorId, user);

    const interactions = await this.interactionRepository.find({
      where: { donor_id: donorId, is_archived: false },
      relations: ["created_by", "assigned_to", "donor"],
      order: { activity_datetime: "DESC" },
    });

    if (!interactions.length) {
      return [];
    }

    const interactionIds = interactions.map((row) => row.id);
    const completedFollowups = await this.followupRepository.find({
      where: {
        interaction_id: In(interactionIds),
        status: "completed",
        is_archived: false,
      },
      select: ["interaction_id"],
    });
    const completedFollowupIds = new Set(
      completedFollowups
        .map((row) => row.interaction_id)
        .filter((id): id is number => id != null),
    );

    return interactions.map((interaction) => ({
      ...interaction,
      has_completed_followup: completedFollowupIds.has(interaction.id),
    }));
  }

  async getInteractionsList(
    query: {
      scope?: "mine" | "team";
      activity_type?: string;
      search?: string;
      limit?: string;
    },
    user: CurrentUser,
  ) {
    const scope = query.scope === "team" ? "team" : "mine";
    if (scope === "team") {
      await this.assertManagementAccess(user);
    }

    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 300);

    const qb = this.interactionRepository
      .createQueryBuilder("i")
      .leftJoinAndSelect("i.donor", "donor")
      .leftJoinAndSelect("i.created_by", "created_by")
      .leftJoinAndSelect("i.assigned_to", "assigned_to")
      .where("i.is_archived = false")
      .orderBy("i.activity_datetime", "DESC")
      .addOrderBy("i.id", "DESC")
      .take(limit);

    if (scope === "mine") {
      qb.andWhere("created_by.id = :uid", { uid: user.id });
    }

    if (query.activity_type) {
      qb.andWhere("i.activity_type = :atype", {
        atype: query.activity_type,
      });
    }

    if (query.search?.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        "(donor.name ILIKE :s OR donor.phone ILIKE :s OR i.user_action_text ILIKE :s OR i.next_action_text ILIKE :s OR i.donor_response_text ILIKE :s)",
        { s },
      );
    }

    const items = await qb.getMany();
    return { scope, total: items.length, items };
  }

  async updateInteraction(
    id: number,
    dto: UpdateDonorInteractionDto,
    user: CurrentUser,
  ) {
    const interaction = await this.findInteractionById(id, user);
    await this.assertCanModifyInteraction(interaction, user);

    if (dto.activity_type !== undefined) {
      interaction.activity_type = dto.activity_type;
    }
    if (dto.custom_activity_title !== undefined) {
      interaction.custom_activity_title = dto.custom_activity_title || null;
    }
    if (dto.user_action_text !== undefined) {
      interaction.user_action_text = dto.user_action_text;
    }
    if (dto.donor_response_text !== undefined) {
      interaction.donor_response_text = dto.donor_response_text || null;
    }
    if (dto.donor_response_type !== undefined) {
      interaction.donor_response_type = dto.donor_response_type || null;
    }
    if (dto.next_action_text !== undefined) {
      interaction.next_action_text = dto.next_action_text || null;
    }
    if (dto.status !== undefined) {
      interaction.status = dto.status;
    }
    if (dto.activity_datetime !== undefined) {
      const activityDatetime = new Date(dto.activity_datetime);
      if (Number.isNaN(activityDatetime.getTime())) {
        throw new BadRequestException("Invalid activity_datetime");
      }
      interaction.activity_datetime = activityDatetime;
    }
    if (dto.next_followup_datetime !== undefined) {
      interaction.next_followup_datetime =
        dto.next_followup_datetime == null || dto.next_followup_datetime === ""
          ? null
          : new Date(dto.next_followup_datetime);
      if (
        interaction.next_followup_datetime &&
        Number.isNaN(interaction.next_followup_datetime.getTime())
      ) {
        throw new BadRequestException("Invalid next_followup_datetime");
      }
    }

    interaction.updated_by = { id: user.id } as User;
    const saved = await this.interactionRepository.save(interaction);
    await this.syncFollowupFromInteraction(saved, user);

    return this.findInteractionById(saved.id, user);
  }

  async deleteInteraction(id: number, user: CurrentUser) {
    const interaction = await this.findInteractionById(id, user);
    await this.assertCanModifyInteraction(interaction, user);

    interaction.is_archived = true;
    interaction.updated_by = { id: user.id } as User;
    await this.interactionRepository.save(interaction);

    await this.followupRepository.update(
      { interaction_id: interaction.id, is_archived: false },
      { is_archived: true },
    );

    return { id: interaction.id, deleted: true };
  }

  async updateFollowup(
    id: number,
    dto: UpdateDonorFollowupDto,
    user: CurrentUser,
  ) {
    const followup = await this.loadFollowupForMutation(id, user);

    if (dto.followup_title !== undefined) {
      followup.followup_title = dto.followup_title;
    }
    if (dto.followup_reason !== undefined) {
      followup.followup_reason = dto.followup_reason || null;
    }
    if (dto.due_datetime !== undefined) {
      const due = new Date(dto.due_datetime);
      if (Number.isNaN(due.getTime())) {
        throw new BadRequestException("Invalid due_datetime");
      }
      followup.due_datetime = due;
      if (followup.status === "pending") {
        followup.status = "rescheduled";
      }
    }
    if (dto.status !== undefined) {
      followup.status = dto.status;
      if (dto.status === "completed") {
        followup.completed_at = new Date();
        followup.completed_by_user_id = user.id;
      }
    }

    followup.updated_by = { id: user.id } as User;
    await this.followupRepository.save(followup);
    return followup;
  }

  async getMyFollowups(
    user: CurrentUser,
    filters?: { bucket?: string; page?: number; pageSize?: number },
  ) {
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.min(50, Math.max(1, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;
    const bucket = (filters?.bucket || "today").toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const qb = this.followupRepository
      .createQueryBuilder("followup")
      .leftJoinAndSelect("followup.donor", "donor")
      .leftJoinAndSelect("donor.assigned_to", "donor_assigned")
      .leftJoinAndSelect("followup.interaction", "interaction")
      .where("followup.assigned_to_user_id = :userId", { userId: user.id })
      .andWhere("followup.is_archived = :archived", { archived: false });

    if (bucket === "completed") {
      qb.andWhere("followup.status = :status", { status: "completed" });
    } else if (bucket === "overdue") {
      qb.andWhere("followup.status IN (:...open)", {
        open: ["pending", "rescheduled"],
      }).andWhere("followup.due_datetime < :startOfToday", { startOfToday });
    } else if (bucket === "upcoming") {
      qb.andWhere("followup.status IN (:...open)", {
        open: ["pending", "rescheduled"],
      }).andWhere("followup.due_datetime > :endOfToday", { endOfToday });
    } else {
      // today
      qb.andWhere("followup.status IN (:...open)", {
        open: ["pending", "rescheduled"],
      })
        .andWhere("followup.due_datetime >= :startOfToday", { startOfToday })
        .andWhere("followup.due_datetime <= :endOfToday", { endOfToday });
    }

    qb.orderBy("followup.due_datetime", "ASC");

    const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async completeFollowup(id: number, user: CurrentUser) {
    const followup = await this.loadFollowupForUser(id, user);
    followup.status = "completed";
    followup.completed_at = new Date();
    followup.completed_by_user_id = user.id;
    await this.followupRepository.save(followup);
    return followup;
  }

  async rescheduleFollowup(
    id: number,
    dto: RescheduleFollowupDto,
    user: CurrentUser,
  ) {
    return this.updateFollowup(
      id,
      {
        due_datetime: dto.due_datetime,
        followup_reason: dto.followup_reason,
      },
      user,
    );
  }

  async getManagementOverview(user: CurrentUser, filters?: { fromDate?: string; toDate?: string }) {
    await this.assertManagementAccess(user);

    const from = filters?.fromDate
      ? new Date(`${filters.fromDate}T00:00:00`)
      : new Date(new Date().setHours(0, 0, 0, 0));
    const to = filters?.toDate
      ? new Date(`${filters.toDate}T23:59:59`)
      : new Date(new Date().setHours(23, 59, 59, 999));

    const todayActivities = await this.interactionRepository
      .createQueryBuilder("i")
      .where("i.activity_datetime BETWEEN :from AND :to", { from, to })
      .getCount();

    const pendingFollowups = await this.followupRepository.count({
      where: [{ status: "pending" }, { status: "rescheduled" }],
    });

    const overdueFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.status IN (:...s)", { s: ["pending", "rescheduled"] })
      .andWhere("f.due_datetime < :now", { now: new Date() })
      .getCount();

    const completedFollowups = await this.followupRepository.count({
      where: { status: "completed" },
    });

    const userRows = await this.interactionRepository
      .createQueryBuilder("i")
      .select("i.created_by", "userId")
      .addSelect("COUNT(*)", "activities")
      .where("i.activity_datetime BETWEEN :from AND :to", { from, to })
      .groupBy("i.created_by")
      .getRawMany();

    const recentInteractions = await this.interactionRepository.find({
      relations: ["donor", "created_by"],
      order: { activity_datetime: "DESC" },
      take: 25,
    });

    return {
      summary: {
        todayActivities,
        pendingFollowups,
        overdueFollowups,
        completedFollowups,
      },
      userActivity: userRows,
      recentInteractions,
    };
  }

  async getAssignedDonorsForSelect(user: CurrentUser) {
    const qb = this.donorRepository
      .createQueryBuilder("donor")
      .select(["donor.id", "donor.name", "donor.phone", "donor.email"])
      .where("donor.is_archived = false")
      .orderBy("donor.name", "ASC");

    if (!(await this.canBypassDonorAssignment(user))) {
      qb.andWhere("donor.assigned_to = :userId", { userId: user.id });
    }

    return qb.getMany();
  }

  private async findInteractionById(id: number, user: CurrentUser) {
    const interaction = await this.interactionRepository.findOne({
      where: { id, is_archived: false },
      relations: ["donor", "created_by", "assigned_to"],
    });
    if (!interaction) {
      throw new NotFoundException("Interaction not found");
    }
    await this.assertDonorAccess(interaction.donor_id, user);
    return interaction;
  }

  private async loadFollowupForUser(id: number, user: CurrentUser) {
    const followup = await this.loadFollowupForMutation(id, user);
    if (Number(followup.assigned_to_user_id) !== Number(user.id)) {
      if (!(await this.canBypassDonorAssignment(user))) {
        throw new ForbiddenException("This follow-up is not assigned to you");
      }
    }
    return followup;
  }

  private async loadFollowupForMutation(id: number, user: CurrentUser) {
    const followup = await this.followupRepository.findOne({
      where: { id, is_archived: false },
      relations: ["donor", "donor.assigned_to", "interaction"],
    });
    if (!followup) {
      throw new NotFoundException("Follow-up not found");
    }
    await this.assertDonorAccess(followup.donor_id, user);
    if (!(await this.canBypassDonorAssignment(user))) {
      if (Number(followup.assigned_to_user_id) !== Number(user.id)) {
        throw new ForbiddenException("This follow-up is not assigned to you");
      }
    }
    await this.assertCanModifyFollowup(followup, user);
    return followup;
  }

  private async syncFollowupFromInteraction(
    interaction: DonorInteraction,
    user: CurrentUser,
  ) {
    if (!interaction.next_followup_datetime) {
      return;
    }

    const due = new Date(interaction.next_followup_datetime);
    if (Number.isNaN(due.getTime())) {
      return;
    }

    const title =
      interaction.next_action_text?.slice(0, 255) ||
      `Follow-up: ${interaction.activity_type}`;

    const openFollowup = await this.followupRepository.findOne({
      where: {
        interaction_id: interaction.id,
        status: In(["pending", "rescheduled"]),
        is_archived: false,
      },
    });

    if (openFollowup) {
      openFollowup.due_datetime = due;
      openFollowup.followup_title = title;
      openFollowup.followup_reason = interaction.next_action_text || null;
      openFollowup.updated_by = { id: user.id } as User;
      await this.followupRepository.save(openFollowup);
      return;
    }

    if (["completed", "closed"].includes(interaction.status)) {
      return;
    }

    const donor = await this.donorRepository.findOne({
      where: { id: interaction.donor_id },
      relations: ["assigned_to"],
    });
    if (!donor) {
      return;
    }

    await this.createFollowupFromInteraction(
      interaction,
      donor,
      due,
      interaction.assigned_to_user_id ??
        this.getDonorAssignedUserId(donor) ??
        user.id,
    );
  }

  private async assertCanModifyInteraction(
    interaction: DonorInteraction,
    user: CurrentUser,
  ) {
    const lockedByStatus = ["completed", "closed"].includes(interaction.status);
    const hasCompletedFollowup = await this.followupRepository.exist({
      where: {
        interaction_id: interaction.id,
        status: "completed",
        is_archived: false,
      },
    });

    if (!lockedByStatus && !hasCompletedFollowup) {
      return;
    }

    if (!(await this.isSuperAdmin(user))) {
      throw new ForbiddenException(
        "Only super admin can modify completed interactions or interactions with completed follow-ups",
      );
    }
  }

  private async assertCanModifyFollowup(
    followup: DonorFollowup,
    user: CurrentUser,
  ) {
    if (followup.status !== "completed") {
      return;
    }
    if (!(await this.isSuperAdmin(user))) {
      throw new ForbiddenException(
        "Only super admin can modify completed follow-ups",
      );
    }
  }

  private async isSuperAdmin(user: CurrentUser): Promise<boolean> {
    if (user?.role === UserRole.SUPER_ADMIN) {
      return true;
    }
    const perms = await this.permissionsService.getUserPermissions(user.id);
    return perms?.super_admin === true;
  }

  private async createFollowupFromInteraction(
    interaction: DonorInteraction,
    donor: Donor,
    due: Date,
    assignedUserId: number,
  ) {
    const title =
      interaction.next_action_text?.slice(0, 255) ||
      `Follow-up: ${interaction.activity_type}`;

    const followup = this.followupRepository.create({
      donor_id: donor.id,
      interaction_id: interaction.id,
      assigned_to_user_id: assignedUserId,
      followup_title: title,
      followup_reason: interaction.next_action_text || null,
      due_datetime: due,
      status: "pending",
      created_by: { id: assignedUserId } as User,
    });

    return this.followupRepository.save(followup);
  }

  private getDonorAssignedUserId(donor: Donor): number | null {
    const assigned = donor.assigned_to as { id?: number } | number | null;
    if (assigned == null) return null;
    return typeof assigned === "object" ? assigned.id ?? null : Number(assigned);
  }

  private async assertDonorAccess(donorId: number, user: CurrentUser): Promise<Donor> {
    const donor = await this.donorRepository.findOne({
      where: { id: donorId },
      relations: ["assigned_to"],
    });
    if (!donor) {
      throw new NotFoundException("Donor not found");
    }
    if (await this.canBypassDonorAssignment(user)) {
      return donor;
    }
    const assignedId = this.getDonorAssignedUserId(donor);
    if (!assignedId || Number(assignedId) !== Number(user.id)) {
      throw new ForbiddenException(
        "You can only interact with donors assigned to you",
      );
    }
    return donor;
  }

  private async assertManagementAccess(user: CurrentUser) {
    if (await this.canBypassDonorAssignment(user)) return;
    const perms = await this.permissionsService.getUserPermissions(user.id);
    if (perms?.fund_raising?.donor_relationship?.manage_overview === true) {
      return;
    }
    throw new ForbiddenException("Management overview access required");
  }

  private async canBypassDonorAssignment(user: CurrentUser): Promise<boolean> {
    if (user?.role === UserRole.SUPER_ADMIN) return true;
    const perms = await this.permissionsService.getUserPermissions(user.id);
    if (perms?.super_admin === true) return true;
    if (perms?.fund_raising_manager === true) return true;
    const scope = this.dataScopeService.readModuleScope(
      perms,
      "fund_raising",
      "donor_relationship",
    );
    return scope === "org";
  }
}
