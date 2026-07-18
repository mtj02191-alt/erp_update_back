import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProgramSubprogram } from "./entities/subprogram.entity";
import { CreateSubprogramDto } from "./dto/create-subprogram.dto";
import { UpdateSubprogramDto } from "./dto/update-subprogram.dto";

@Injectable()
export class SubprogramsService {
  constructor(
    @InjectRepository(ProgramSubprogram)
    private readonly subprogramsRepository: Repository<ProgramSubprogram>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "program_id",
      "key",
      "label",
      "status",
      "created_at",
      "updated_at",
    ]);
    if (!sortField || !allowed.has(sortField)) return "created_at";
    return sortField;
  }

  private normalizeSortOrder(sortOrder?: string) {
    return sortOrder === "ASC" ? "ASC" : "DESC";
  }

  private async ensureSeededDefaults() {
    const count = await this.subprogramsRepository.count({
      where: { is_archived: false },
    });

    if (count > 0) return;

    const defaults: Array<
      Pick<ProgramSubprogram, "program_id" | "key" | "label" | "status">
    > = [
      {
        program_id: 1,
        key: "food_security_general",
        label: "General distribution",
        status: "active",
      },
      {
        program_id: 1,
        key: "food_security_targeted",
        label: "Targeted assistance",
        status: "active",
      },
      {
        program_id: 2,
        key: "community_services_general",
        label: "General",
        status: "active",
      },
      {
        program_id: 2,
        key: "community_services_outreach",
        label: "Outreach",
        status: "active",
      },
      {
        program_id: 3,
        key: "education_general",
        label: "General",
        status: "active",
      },
      {
        program_id: 3,
        key: "education_scholarships",
        label: "Scholarships",
        status: "active",
      },
      {
        program_id: 4,
        key: "water_hand_pumps",
        label: "Hand pumps",
        status: "active",
      },
      {
        program_id: 4,
        key: "water_filtration",
        label: "Filtration systems",
        status: "active",
      },
      {
        program_id: 5,
        key: "kasb_tulamba",
        label: "Tulamba center",
        status: "active",
      },
      {
        program_id: 5,
        key: "kasb_abdul_hakim",
        label: "Abdul Hakim center",
        status: "active",
      },
      {
        program_id: 6,
        key: "green_initiative_general",
        label: "General",
        status: "active",
      },
      {
        program_id: 6,
        key: "green_initiative_afforestation",
        label: "Afforestation",
        status: "active",
      },
      {
        program_id: 7,
        key: "wocp_general",
        label: "General",
        status: "active",
      },
      {
        program_id: 7,
        key: "wocp_shelter",
        label: "Shelter support",
        status: "active",
      },
      {
        program_id: 8,
        key: "livelihood_general",
        label: "General",
        status: "active",
      },
      {
        program_id: 8,
        key: "livelihood_skills",
        label: "Skills training",
        status: "active",
      },
      {
        program_id: 9,
        key: "disaster_relief",
        label: "Relief operations",
        status: "active",
      },
      {
        program_id: 9,
        key: "disaster_preparedness",
        label: "Preparedness",
        status: "active",
      },
    ];

    // If programs are managed via DB, align subprogram.program_id to that table's ids.
    // Otherwise, we seed using the legacy ids (1..9), which match your previous `programs_list`.
    let programIdRemap: Record<number, number> = {};
    try {
      const manager = this.subprogramsRepository.manager;
      const programs = await manager.query(
        `select id, key from programs where is_archived = false`,
      );

      const keyToId: Record<string, number> = {};
      (programs || []).forEach((p: any) => {
        if (p?.key && p?.id) keyToId[String(p.key)] = Number(p.id);
      });

      const legacyProgramKeyById: Record<number, string> = {
        1: "food_security",
        2: "community_services",
        3: "education",
        4: "water_clean_water",
        5: "kasb",
        6: "green_initiative",
        7: "widows_and_orphans_care_program",
        8: "livelihood_support_program",
        9: "disaster_management",
      };

      Object.entries(legacyProgramKeyById).forEach(([legacyIdStr, key]) => {
        const legacyId = Number(legacyIdStr);
        const dbId = keyToId[key];
        if (dbId) programIdRemap[legacyId] = dbId;
      });
    } catch {
      programIdRemap = {};
    }

    await this.subprogramsRepository.insert(
      defaults.map((d) => ({
        ...d,
        program_id: programIdRemap[d.program_id] ?? d.program_id,
        is_archived: false,
      })),
    );
  }

  async create(createSubprogramDto: CreateSubprogramDto, user: any) {
    await this.ensureSeededDefaults();

    const existing = await this.subprogramsRepository.findOne({
      where: {
        is_archived: false,
        program_id: createSubprogramDto.program_id,
        key: createSubprogramDto.key,
      },
    });

    if (existing) {
      throw new BadRequestException(
        "Subprogram key already exists for this program",
      );
    }

    const status = createSubprogramDto.status ?? "active";
    const entity = this.subprogramsRepository.create({
      ...createSubprogramDto,
      status,
      is_archived: false,
      created_by: user,
      updated_by: user,
    });

    const saved = await this.subprogramsRepository.save(entity);
    return {
      success: true,
      message: "Subprogram created successfully",
      data: saved,
    };
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: "ASC" | "DESC";
    active?: boolean;
    program_id?: number;
    search?: string;
  }) {
    await this.ensureSeededDefaults();

    const {
      page = 1,
      pageSize = 10,
      sortField,
      sortOrder,
      active,
      program_id,
      search,
    } = params;

    const query = this.subprogramsRepository.createQueryBuilder("subprogram");

    query.where("subprogram.is_archived = false");

    if (typeof active === "boolean") {
      query.andWhere("subprogram.status = :status", {
        status: active ? "active" : "inactive",
      });
    }

    if (program_id) {
      query.andWhere("subprogram.program_id = :program_id", { program_id });
    }

    if (search) {
      query.andWhere(
        "(subprogram.key ILIKE :search OR subprogram.label ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const safeSortField = this.normalizeSortField(sortField);
    const safeSortOrder = this.normalizeSortOrder(sortOrder);

    const [rows, total] = await query
      .orderBy(`subprogram.${safeSortField}`, safeSortOrder)
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: rows,
      pagination: { page, pageSize, total, totalPages },
    };
  }

  async findOne(id: number) {
    await this.ensureSeededDefaults();

    const found = await this.subprogramsRepository.findOne({
      where: { id, is_archived: false },
    });

    if (!found) {
      throw new BadRequestException("Subprogram not found");
    }

    return { success: true, data: found };
  }

  async update(
    id: number,
    updateSubprogramDto: UpdateSubprogramDto,
    user: any,
  ) {
    await this.ensureSeededDefaults();

    const existing = await this.subprogramsRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Subprogram not found");

    if (updateSubprogramDto.key || updateSubprogramDto.program_id) {
      const programId = updateSubprogramDto.program_id ?? existing.program_id;
      const key = updateSubprogramDto.key ?? existing.key;
      const duplicate = await this.subprogramsRepository.findOne({
        where: {
          is_archived: false,
          program_id: programId,
          key,
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          "Subprogram key already exists for this program",
        );
      }
    }

    await this.subprogramsRepository.update(id, {
      ...updateSubprogramDto,
      status: updateSubprogramDto.status ?? existing.status,
      updated_by: user,
    });

    const updated = await this.subprogramsRepository.findOne({
      where: { id, is_archived: false },
    });

    return {
      success: true,
      message: "Subprogram updated successfully",
      data: updated,
    };
  }

  async remove(id: number) {
    await this.ensureSeededDefaults();

    const existing = await this.subprogramsRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Subprogram not found");

    await this.subprogramsRepository.update(id, { is_archived: true });
    return { success: true, message: "Subprogram deleted successfully" };
  }
}
