import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TreePlantationReport } from "./entities/tree-plantation-report.entity";
import { CreateTreePlantationReportDto } from "./dto/create-tree-plantation-report.dto";
import { UpdateTreePlantationReportDto } from "./dto/update-tree-plantation-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class TreePlantationReportsService {
  constructor(
    @InjectRepository(TreePlantationReport)
    private readonly repo: Repository<TreePlantationReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateTreePlantationReportDto, user: User) {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const entity = this.repo.create({
        ...dto,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return this.repo.save(entity);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(
    page = 1,
    pageSize = 10,
    sortField = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
  ) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.repo.findAndCount({
      where: { is_archived: false },
      skip,
      take: pageSize,
      order: { [sortField]: sortOrder },
    });
    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const entity = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!entity)
      throw new NotFoundException("Tree plantation report not found");
    return entity;
  }

  async update(id: number, dto: UpdateTreePlantationReportDto) {
    const report = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Tree plantation report with ID ${id} not found`,
      );
    }
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const report = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Tree plantation report with ID ${id} not found`,
      );
    }
    await this.repo.update(id, { is_archived: true });
  }
}
