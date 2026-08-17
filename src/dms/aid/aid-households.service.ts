import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/user.entity";
import { AidHouseholdRole } from "./aid.enums";
import {
  CreateAidHouseholdDto,
  CreateAidHouseholdMemberDto,
  UpdateAidHouseholdDto,
} from "./dto/aid.dto";
import { AidHouseholdMember } from "./entities/aid-household-member.entity";
import { AidHousehold } from "./entities/aid-household.entity";
import { AidPeopleService } from "./aid-people.service";

@Injectable()
export class AidHouseholdsService {
  constructor(
    @InjectRepository(AidHousehold)
    private readonly householdRepo: Repository<AidHousehold>,
    @InjectRepository(AidHouseholdMember)
    private readonly memberRepo: Repository<AidHouseholdMember>,
    private readonly peopleService: AidPeopleService,
  ) {}

  async create(dto: CreateAidHouseholdDto, user?: User) {
    if (dto.head_person_id) {
      await this.peopleService.findOne(dto.head_person_id);
    }
    const household = await this.householdRepo.save(
      this.householdRepo.create({
        code: dto.code?.trim() || null,
        label: dto.label?.trim() || null,
        address: dto.address?.trim() || null,
        head_person_id: dto.head_person_id ?? null,
        notes: dto.notes?.trim() || null,
        created_by: user || null,
        updated_by: user || null,
      }),
    );

    if (dto.head_person_id) {
      await this.addMember(
        household.id,
        {
          person_id: dto.head_person_id,
          role_in_household: AidHouseholdRole.HEAD,
        },
        user,
      );
    }

    for (const m of dto.members || []) {
      if (m.person_id === dto.head_person_id) continue;
      await this.addMember(household.id, m, user);
    }

    return this.findOne(household.id);
  }

  async findAll(params: { search?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const qb = this.householdRepo
      .createQueryBuilder("h")
      .leftJoinAndSelect("h.head_person", "head")
      .where("h.is_archived = :archived", { archived: false })
      .orderBy("h.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const search = String(params.search || "").trim();
    if (search) {
      qb.andWhere(
        "(h.label ILIKE :q OR h.code ILIKE :q OR h.address ILIKE :q)",
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
    const household = await this.householdRepo.findOne({
      where: { id, is_archived: false },
      relations: ["head_person"],
    });
    if (!household) throw new NotFoundException(`Household #${id} not found`);
    const members = await this.memberRepo.find({
      where: { household_id: id, is_archived: false },
      relations: ["person"],
      order: { id: "ASC" },
    });
    return { ...household, members };
  }

  async update(id: number, dto: UpdateAidHouseholdDto, user?: User) {
    const household = await this.householdRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!household) throw new NotFoundException(`Household #${id} not found`);
    if (dto.head_person_id !== undefined && dto.head_person_id != null) {
      await this.peopleService.findOne(dto.head_person_id);
      household.head_person_id = dto.head_person_id;
    } else if (dto.head_person_id === null) {
      household.head_person_id = null;
    }
    if (dto.code !== undefined) household.code = dto.code?.trim() || null;
    if (dto.label !== undefined) household.label = dto.label?.trim() || null;
    if (dto.address !== undefined) household.address = dto.address?.trim() || null;
    if (dto.notes !== undefined) household.notes = dto.notes?.trim() || null;
    household.updated_by = user || null;
    await this.householdRepo.save(household);
    return this.findOne(id);
  }

  async addMember(
    householdId: number,
    dto: CreateAidHouseholdMemberDto,
    user?: User,
  ) {
    await this.findOne(householdId);
    await this.peopleService.findOne(dto.person_id);
    const existing = await this.memberRepo.findOne({
      where: {
        household_id: householdId,
        person_id: dto.person_id,
        is_archived: false,
      },
    });
    if (existing) {
      throw new ConflictException("Person is already in this household");
    }
    const member = this.memberRepo.create({
      household_id: householdId,
      person_id: dto.person_id,
      role_in_household: dto.role_in_household || AidHouseholdRole.OTHER,
      created_by: user || null,
      updated_by: user || null,
    });
    return this.memberRepo.save(member);
  }

  async removeMember(memberId: number, user?: User) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, is_archived: false },
    });
    if (!member) throw new NotFoundException(`Member #${memberId} not found`);
    member.is_archived = true;
    member.updated_by = user || null;
    return this.memberRepo.save(member);
  }

  async softDelete(id: number, user?: User) {
    const household = await this.householdRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!household) throw new NotFoundException(`Household #${id} not found`);
    household.is_archived = true;
    household.updated_by = user || null;
    return this.householdRepo.save(household);
  }
}
