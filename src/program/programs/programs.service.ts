import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProgramEntity } from "./entities/program.entity";
import { CreateProgramDto } from "./dto/create-program.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(ProgramEntity)
    private readonly programsRepository: Repository<ProgramEntity>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "key",
      "label",
      "logo",
      "status",
      "created_at",
      "updated_at",
      "is_archived",
    ]);
    if (!sortField || !allowed.has(sortField)) return "created_at";
    return sortField;
  }

  private normalizeSortOrder(sortOrder?: string) {
    return sortOrder === "ASC" ? "ASC" : "DESC";
  }

  private async ensureSeededDefaults() {
    const totalCount = await this.programsRepository.count();
    if (totalCount > 0) return;

    const defaults: Array<
      Pick<
        ProgramEntity,
        "id" | "key" | "label" | "logo" | "status" | "applicationable"
      >
    > = [
      {
        id: 1,
        key: "food_security",
        label: "Food Security",
        logo: "/public/assets/images/program_logos/ration.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 2,
        key: "community_services",
        label: "Community Services",
        logo: "/public/assets/images/program_logos/ration.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 3,
        key: "education",
        label: "Education",
        logo: "/public/assets/images/program_logos/education.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 4,
        key: "water_clean_water",
        label: "Water & Clean Water",
        logo: "/public/assets/images/program_logos/water.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 5,
        key: "kasb",
        label: "KASB",
        logo: "/public/assets/images/program_logos/kasb.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 6,
        key: "green_initiative",
        label: "Green Initiative",
        logo: "/public/assets/images/program_logos/kasb.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 7,
        key: "widows_and_orphans_care_program",
        label: "Widows and Orphans Care Program",
        logo: "/public/assets/images/program_logos/maskan.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 8,
        key: "livelihood_support_program",
        label: "Livelihood Support Program",
        logo: "/public/assets/images/program_logos/kasb.png",
        status: "active",
        applicationable: true,
      },
      {
        id: 9,
        key: "disaster_management",
        label: "Disaster Management",
        logo: "/public/assets/images/program_logos/disaster_management.png",
        status: "active",
        applicationable: true,
      },
    ];

    await this.programsRepository.insert(
      defaults.map((d) => ({
        ...d,
        is_archived: false,
      })),
    );
  }

  async create(createProgramDto: CreateProgramDto, user: any) {
    await this.ensureSeededDefaults();

    const existing = await this.programsRepository.findOne({
      where: { key: createProgramDto.key },
    });
    if (existing && !existing.is_archived) {
      throw new BadRequestException("Program key already exists");
    }

    const status = createProgramDto.status ?? "active";
    const applicationable = createProgramDto.applicationable ?? true;
    const entity = this.programsRepository.create({
      ...createProgramDto,
      status,
      applicationable,
      is_archived: false,
      created_by: user,
      updated_by: user,
    });

    const saved = await this.programsRepository.save(entity);
    return {
      success: true,
      message: "Program created successfully",
      data: saved,
    };
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: "ASC" | "DESC";
    active?: boolean;
    /** When set, filter by `applicationable` */
    applicationable?: boolean;
    search?: string;
  }) {
    await this.ensureSeededDefaults();

    const {
      page = 1,
      pageSize = 10,
      sortField,
      sortOrder,
      active,
      applicationable,
      search,
    } = params;

    const query = this.programsRepository.createQueryBuilder("program");

    query.where("program.is_archived = false");

    if (typeof active === "boolean") {
      query.andWhere("program.status = :status", {
        status: active ? "active" : "inactive",
      });
    }

    if (typeof applicationable === "boolean") {
      query.andWhere("program.applicationable = :applicationable", {
        applicationable,
      });
    }

    if (typeof applicationable === "boolean") {
      query.andWhere("program.applicationable = :applicationable", {
        applicationable,
      });
    }

    if (search) {
      query.andWhere(
        "(program.key ILIKE :search OR program.label ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const safeSortField = this.normalizeSortField(sortField);
    const safeSortOrder = this.normalizeSortOrder(sortOrder);

    const [rows, total] = await query
      .orderBy(`program.${safeSortField}`, safeSortOrder)
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

    const found = await this.programsRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!found) throw new BadRequestException("Program not found");
    return { success: true, data: found };
  }

  async update(id: number, updateProgramDto: UpdateProgramDto, user: any) {
    await this.ensureSeededDefaults();

    const existing = await this.programsRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Program not found");

    if (updateProgramDto.key && updateProgramDto.key !== existing.key) {
      const duplicate = await this.programsRepository.findOne({
        where: { key: updateProgramDto.key, is_archived: false } as any,
      });
      if (duplicate)
        throw new BadRequestException("Program key already exists");
    }

    await this.programsRepository.update(id, {
      ...updateProgramDto,
      status: updateProgramDto.status ?? existing.status,
      updated_by: user,
    });

    const updated = await this.programsRepository.findOne({
      where: { id, is_archived: false },
    });
    return {
      success: true,
      message: "Program updated successfully",
      data: updated,
    };
  }

  async remove(id: number) {
    await this.ensureSeededDefaults();

    const existing = await this.programsRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Program not found");

    await this.programsRepository.update(id, { is_archived: true });
    return { success: true, message: "Program deleted successfully" };
  }
}
