import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../../users/user.entity";
import { AidKinshipRelation, AidPersonGender } from "./aid.enums";
import {
  CreateAidFamilyMemberDto,
  CreateAidKinshipDto,
  CreateAidPersonDto,
  UpdateAidPersonDto,
} from "./dto/aid.dto";
import { AidApplication } from "./entities/aid-application.entity";
import { AidHouseholdMember } from "./entities/aid-household-member.entity";
import { AidKinshipEdge } from "./entities/aid-kinship-edge.entity";
import { AidPerson } from "./entities/aid-person.entity";

type FamilyMemberRow = {
  edge_id: number;
  relation_type: AidKinshipRelation;
  notes: string | null;
  person: AidPerson;
};

@Injectable()
export class AidPeopleService {
  constructor(
    @InjectRepository(AidPerson)
    private readonly personRepo: Repository<AidPerson>,
    @InjectRepository(AidKinshipEdge)
    private readonly kinshipRepo: Repository<AidKinshipEdge>,
    @InjectRepository(AidHouseholdMember)
    private readonly memberRepo: Repository<AidHouseholdMember>,
    @InjectRepository(AidApplication)
    private readonly applicationRepo: Repository<AidApplication>,
  ) {}

  normalizeCnic(cnic?: string | null): string | null {
    if (cnic == null) return null;
    const digits = String(cnic).replace(/\D/g, "");
    if (!digits) return null;
    return digits;
  }

  private async assertUniqueCnic(cnic: string | null, excludeId?: number) {
    if (!cnic) return;
    const existing = await this.personRepo.findOne({
      where: { cnic, is_archived: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `CNIC already registered to person #${existing.id} (${existing.full_name})`,
      );
    }
  }

  private mapPersonFields(dto: CreateAidPersonDto | UpdateAidPersonDto) {
    const income =
      dto.monthly_income === undefined || dto.monthly_income === null || dto.monthly_income === ""
        ? undefined
        : String(dto.monthly_income);
    return {
      phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
      gender: dto.gender !== undefined ? dto.gender : undefined,
      date_of_birth: dto.date_of_birth !== undefined ? dto.date_of_birth || null : undefined,
      marital_status: dto.marital_status !== undefined ? dto.marital_status : undefined,
      occupation:
        dto.occupation !== undefined ? dto.occupation?.trim() || null : undefined,
      education_level: dto.education_level !== undefined ? dto.education_level : undefined,
      monthly_income: income === undefined ? undefined : income,
      is_alive: dto.is_alive !== undefined ? dto.is_alive : undefined,
      health_notes:
        dto.health_notes !== undefined ? dto.health_notes?.trim() || null : undefined,
      address: dto.address !== undefined ? dto.address?.trim() || null : undefined,
      city: dto.city !== undefined ? dto.city?.trim() || null : undefined,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      is_active: dto.is_active !== undefined ? dto.is_active : undefined,
    };
  }

  async create(dto: CreateAidPersonDto, user?: User) {
    const cnic = this.normalizeCnic(dto.cnic);
    await this.assertUniqueCnic(cnic);
    const mapped = this.mapPersonFields(dto);
    const row = this.personRepo.create({
      full_name: dto.full_name.trim(),
      cnic,
      phone: mapped.phone ?? null,
      gender: mapped.gender ?? null,
      date_of_birth: mapped.date_of_birth ?? null,
      marital_status: mapped.marital_status ?? null,
      occupation: mapped.occupation ?? null,
      education_level: mapped.education_level ?? null,
      monthly_income: mapped.monthly_income ?? null,
      is_alive: mapped.is_alive !== false,
      health_notes: mapped.health_notes ?? null,
      address: mapped.address ?? null,
      city: mapped.city ?? null,
      notes: mapped.notes ?? null,
      is_active: mapped.is_active !== false,
      created_by: user || null,
      updated_by: user || null,
    });
    return this.personRepo.save(row);
  }

  async findAll(params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const qb = this.personRepo
      .createQueryBuilder("p")
      .where("p.is_archived = :archived", { archived: false })
      .orderBy("p.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const search = String(params.search || "").trim();
    if (search) {
      qb.andWhere(
        "(p.full_name ILIKE :q OR p.cnic ILIKE :q OR p.phone ILIKE :q OR p.city ILIKE :q)",
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
    const person = await this.personRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  private buildFamilyTree(
    egoId: number,
    kinship: AidKinshipEdge[],
  ): Record<string, FamilyMemberRow[]> {
    const tree: Record<string, FamilyMemberRow[]> = {
      parents: [],
      spouse: [],
      children: [],
      brothers: [],
      sisters: [],
      siblings: [],
      grandparents: [],
      grandchildren: [],
      extended: [],
    };

    const push = (bucket: string, edge: AidKinshipEdge, person: AidPerson, relation: AidKinshipRelation) => {
      tree[bucket].push({
        edge_id: edge.id,
        relation_type: relation,
        notes: edge.notes,
        person,
      });
    };

    for (const edge of kinship) {
      let relative: AidPerson | null = null;
      let relation = edge.relation_type;

      if (edge.from_person_id === egoId) {
        relative = edge.to_person;
      } else if (edge.to_person_id === egoId) {
        // Incoming edge: invert common directed relations so tree is ego-centric
        relative = edge.from_person;
        const invert: Partial<Record<AidKinshipRelation, AidKinshipRelation>> = {
          [AidKinshipRelation.FATHER]: AidKinshipRelation.SON,
          [AidKinshipRelation.MOTHER]: AidKinshipRelation.SON,
          [AidKinshipRelation.SON]: AidKinshipRelation.FATHER,
          [AidKinshipRelation.DAUGHTER]: AidKinshipRelation.FATHER,
          [AidKinshipRelation.CHILD]: AidKinshipRelation.FATHER,
          [AidKinshipRelation.BROTHER]: AidKinshipRelation.BROTHER,
          [AidKinshipRelation.SISTER]: AidKinshipRelation.SISTER,
          [AidKinshipRelation.SIBLING]: AidKinshipRelation.SIBLING,
          [AidKinshipRelation.SPOUSE]: AidKinshipRelation.SPOUSE,
          [AidKinshipRelation.GRANDFATHER]: AidKinshipRelation.GRANDCHILD,
          [AidKinshipRelation.GRANDMOTHER]: AidKinshipRelation.GRANDCHILD,
          [AidKinshipRelation.GRANDCHILD]: AidKinshipRelation.GRANDFATHER,
        };
        relation = invert[edge.relation_type] || edge.relation_type;
        if (
          (edge.relation_type === AidKinshipRelation.FATHER ||
            edge.relation_type === AidKinshipRelation.MOTHER) &&
          relative?.gender === AidPersonGender.FEMALE
        ) {
          relation = AidKinshipRelation.DAUGHTER;
        }
        if (
          (edge.relation_type === AidKinshipRelation.SON ||
            edge.relation_type === AidKinshipRelation.DAUGHTER ||
            edge.relation_type === AidKinshipRelation.CHILD) &&
          relative?.gender === AidPersonGender.FEMALE
        ) {
          relation = AidKinshipRelation.MOTHER;
        }
      }

      if (!relative) continue;

      switch (relation) {
        case AidKinshipRelation.FATHER:
        case AidKinshipRelation.MOTHER:
          push("parents", edge, relative, relation);
          break;
        case AidKinshipRelation.SPOUSE:
          push("spouse", edge, relative, relation);
          break;
        case AidKinshipRelation.SON:
        case AidKinshipRelation.DAUGHTER:
        case AidKinshipRelation.CHILD:
          push("children", edge, relative, relation);
          break;
        case AidKinshipRelation.BROTHER:
          push("brothers", edge, relative, relation);
          break;
        case AidKinshipRelation.SISTER:
          push("sisters", edge, relative, relation);
          break;
        case AidKinshipRelation.SIBLING:
          if (relative.gender === AidPersonGender.MALE) {
            push("brothers", edge, relative, AidKinshipRelation.BROTHER);
          } else if (relative.gender === AidPersonGender.FEMALE) {
            push("sisters", edge, relative, AidKinshipRelation.SISTER);
          } else {
            push("siblings", edge, relative, relation);
          }
          break;
        case AidKinshipRelation.GRANDFATHER:
        case AidKinshipRelation.GRANDMOTHER:
          push("grandparents", edge, relative, relation);
          break;
        case AidKinshipRelation.GRANDCHILD:
          push("grandchildren", edge, relative, relation);
          break;
        default:
          push("extended", edge, relative, relation);
      }
    }

    return tree;
  }

  async findOneDetailed(id: number) {
    const person = await this.findOne(id);
    const kinship = await this.kinshipRepo.find({
      where: [
        { from_person_id: id, is_archived: false },
        { to_person_id: id, is_archived: false },
      ],
      relations: ["from_person", "to_person"],
      order: { id: "ASC" },
    });
    const memberships = await this.memberRepo.find({
      where: { person_id: id, is_archived: false },
      relations: ["household", "household.head_person"],
    });
    const applications = await this.applicationRepo.find({
      where: [
        { beneficiary_person_id: id, is_archived: false },
        { writer_person_id: id, is_archived: false },
      ],
      order: { created_at: "DESC" },
      take: 50,
    });

    const relatedIds = new Set<number>();
    for (const e of kinship) {
      relatedIds.add(e.from_person_id);
      relatedIds.add(e.to_person_id);
    }
    for (const m of memberships) {
      const mates = await this.memberRepo.find({
        where: { household_id: m.household_id, is_archived: false },
        relations: ["person"],
      });
      for (const mate of mates) relatedIds.add(mate.person_id);
    }
    relatedIds.delete(id);

    const relatedPeople =
      relatedIds.size > 0
        ? await this.personRepo.find({
            where: { id: In([...relatedIds]), is_archived: false },
          })
        : [];

    const households = [];
    for (const m of memberships) {
      if (!m.household) continue;
      const mates = await this.memberRepo.find({
        where: { household_id: m.household_id, is_archived: false },
        relations: ["person"],
        order: { id: "ASC" },
      });
      households.push({
        ...m.household,
        membership_id: m.id,
        role_in_household: m.role_in_household,
        members: mates,
      });
    }

    const family_tree = this.buildFamilyTree(id, kinship);
    const family_counts = {
      parents: family_tree.parents.length,
      spouse: family_tree.spouse.length,
      children: family_tree.children.length,
      brothers: family_tree.brothers.length,
      sisters: family_tree.sisters.length,
      siblings: family_tree.siblings.length,
      grandparents: family_tree.grandparents.length,
      grandchildren: family_tree.grandchildren.length,
      extended: family_tree.extended.length,
      total_linked: relatedPeople.length,
    };

    return {
      person,
      kinship,
      family_tree,
      family_counts,
      households,
      applications,
      related_people: relatedPeople,
    };
  }

  async update(id: number, dto: UpdateAidPersonDto, user?: User) {
    const person = await this.findOne(id);
    if (dto.cnic !== undefined) {
      const cnic = this.normalizeCnic(dto.cnic);
      await this.assertUniqueCnic(cnic, id);
      person.cnic = cnic;
    }
    if (dto.full_name !== undefined) person.full_name = dto.full_name.trim();
    const mapped = this.mapPersonFields(dto);
    if (mapped.phone !== undefined) person.phone = mapped.phone;
    if (mapped.gender !== undefined) person.gender = mapped.gender;
    if (mapped.date_of_birth !== undefined) person.date_of_birth = mapped.date_of_birth;
    if (mapped.marital_status !== undefined) person.marital_status = mapped.marital_status;
    if (mapped.occupation !== undefined) person.occupation = mapped.occupation;
    if (mapped.education_level !== undefined) person.education_level = mapped.education_level;
    if (mapped.monthly_income !== undefined) person.monthly_income = mapped.monthly_income;
    if (mapped.is_alive !== undefined) person.is_alive = mapped.is_alive;
    if (mapped.health_notes !== undefined) person.health_notes = mapped.health_notes;
    if (mapped.address !== undefined) person.address = mapped.address;
    if (mapped.city !== undefined) person.city = mapped.city;
    if (mapped.notes !== undefined) person.notes = mapped.notes;
    if (mapped.is_active !== undefined) person.is_active = mapped.is_active;
    person.updated_by = user || null;
    return this.personRepo.save(person);
  }

  async softDelete(id: number, user?: User) {
    const person = await this.findOne(id);
    person.is_archived = true;
    person.updated_by = user || null;
    return this.personRepo.save(person);
  }

  async addKinship(fromPersonId: number, dto: CreateAidKinshipDto, user?: User) {
    await this.findOne(fromPersonId);
    await this.findOne(dto.to_person_id);
    if (fromPersonId === dto.to_person_id) {
      throw new BadRequestException("Cannot link a person to themselves");
    }
    const existing = await this.kinshipRepo.findOne({
      where: {
        from_person_id: fromPersonId,
        to_person_id: dto.to_person_id,
        relation_type: dto.relation_type,
        is_archived: false,
      },
    });
    if (existing) {
      throw new ConflictException("This kinship edge already exists");
    }
    const edge = this.kinshipRepo.create({
      from_person_id: fromPersonId,
      to_person_id: dto.to_person_id,
      relation_type: dto.relation_type,
      notes: dto.notes?.trim() || null,
      created_by: user || null,
      updated_by: user || null,
    });
    return this.kinshipRepo.save(edge);
  }

  /** Create (or link) a relative and attach as family member of ego. */
  async addFamilyMember(
    fromPersonId: number,
    dto: CreateAidFamilyMemberDto,
    user?: User,
  ) {
    await this.findOne(fromPersonId);
    let toPersonId = dto.existing_person_id;
    if (!toPersonId && dto.person) {
      const created = await this.create(dto.person, user);
      toPersonId = created.id;
    }
    if (!toPersonId) {
      throw new BadRequestException(
        "Provide existing_person_id or person payload for the relative",
      );
    }
    const edge = await this.addKinship(
      fromPersonId,
      {
        to_person_id: toPersonId,
        relation_type: dto.relation_type,
        notes: dto.notes,
      },
      user,
    );
    const person = await this.findOne(toPersonId);
    return { edge, person };
  }

  async removeKinship(edgeId: number, user?: User) {
    const edge = await this.kinshipRepo.findOne({
      where: { id: edgeId, is_archived: false },
    });
    if (!edge) throw new NotFoundException(`Kinship edge #${edgeId} not found`);
    edge.is_archived = true;
    edge.updated_by = user || null;
    return this.kinshipRepo.save(edge);
  }
}
