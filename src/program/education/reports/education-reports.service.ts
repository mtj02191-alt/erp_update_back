import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EducationReport } from "./entities/education-report.entity";
import { CreateEducationReportDto } from "./dto/create-education-report.dto";
import { UpdateEducationReportDto } from "./dto/update-education-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class EducationReportsService {
  constructor(
    @InjectRepository(EducationReport)
    private readonly repo: Repository<EducationReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateEducationReportDto, user: User) {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const entity = this.repo.create({
        ...dto,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.repo.save(entity);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.repo
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.repo.count({ where: { is_archived: false } });
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch education reports: " + error.message,
      );
    }
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id, is_archived: false } });
  }

  async update(id: number, updateEducationReportDto: UpdateEducationReportDto) {
    const updateData: any = { ...updateEducationReportDto };
    if (updateEducationReportDto.date) {
      updateData.date = new Date(updateEducationReportDto.date);
    }
    const report = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Education report with ID ${id} not found`);
    }
    return this.repo.update(id, updateData);
  }

  async remove(id: number) {
    const report = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Education report with ID ${id} not found`);
    }
    return this.repo.update(id, { is_archived: true });
  }
}
