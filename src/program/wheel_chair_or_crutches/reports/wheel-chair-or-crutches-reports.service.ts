import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WheelChairOrCrutchesReport } from "./entities/wheel-chair-or-crutches-report.entity";
import { CreateWheelChairOrCrutchesReportDto } from "./dto/create-wheel-chair-or-crutches-report.dto";
import { UpdateWheelChairOrCrutchesReportDto } from "./dto/update-wheel-chair-or-crutches-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class WheelChairOrCrutchesReportsService {
  constructor(
    @InjectRepository(WheelChairOrCrutchesReport)
    private readonly wheelChairOrCrutchesReportRepository: Repository<WheelChairOrCrutchesReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateWheelChairOrCrutchesReportDto, user: User) {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.wheelChairOrCrutchesReportRepository.create({
        date: new Date(createDto.date),
        type: createDto.type,
        gender: createDto.gender,
        orphans: createDto.orphans || 0,
        divorced: createDto.divorced || 0,
        disable: createDto.disable || 0,
        indegent: createDto.indegent || 0,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.wheelChairOrCrutchesReportRepository.save(report);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createMultiple(
    createDtos: CreateWheelChairOrCrutchesReportDto[],
  ): Promise<WheelChairOrCrutchesReport[]> {
    const reports = createDtos.map((dto) =>
      this.wheelChairOrCrutchesReportRepository.create({
        date: new Date(dto.date),
        type: dto.type,
        gender: dto.gender,
        orphans: dto.orphans || 0,
        divorced: dto.divorced || 0,
        disable: dto.disable || 0,
        indegent: dto.indegent || 0,
      }),
    );

    return await this.wheelChairOrCrutchesReportRepository.save(reports);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.wheelChairOrCrutchesReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.wheelChairOrCrutchesReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);

      // Group reports by date
      const groupedReports = reports.reduce((acc, report) => {
        const dateKey =
          report.date instanceof Date
            ? report.date.toISOString().split("T")[0]
            : new Date(report.date).toISOString().split("T")[0];

        if (!acc[dateKey]) {
          acc[dateKey] = {
            id: report.id,
            date: report.date,
            distributions: [],
          };
        }

        acc[dateKey].distributions.push({
          id: report.id,
          type: report.type,
          gender: report.gender,
          vulnerabilities: {
            Orphans: report.orphans,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
          },
        });

        return acc;
      }, {});

      const formattedReports = Object.values(groupedReports);

      return {
        data: formattedReports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch wheel chair or crutches reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<WheelChairOrCrutchesReport> {
    const report = await this.wheelChairOrCrutchesReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Wheel chair or crutches report with ID ${id} not found`,
      );
    }
    return report;
  }

  async findByDate(date: string): Promise<WheelChairOrCrutchesReport[]> {
    return await this.wheelChairOrCrutchesReportRepository.find({
      where: { date: new Date(date) },
      order: { id: "ASC" },
    });
  }

  async update(
    id: number,
    updateDto: UpdateWheelChairOrCrutchesReportDto,
  ): Promise<WheelChairOrCrutchesReport> {
    const report = await this.wheelChairOrCrutchesReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Wheel chair or crutches report with ID ${id} not found`,
      );
    }

    if (updateDto.date) {
      report.date = updateDto.date;
    }
    if (updateDto.type) {
      report.type = updateDto.type;
    }
    if (updateDto.gender) {
      report.gender = updateDto.gender;
    }
    if (updateDto.orphans !== undefined) {
      report.orphans = updateDto.orphans;
    }
    if (updateDto.divorced !== undefined) {
      report.divorced = updateDto.divorced;
    }
    if (updateDto.disable !== undefined) {
      report.disable = updateDto.disable;
    }
    if (updateDto.indegent !== undefined) {
      report.indegent = updateDto.indegent;
    }

    return await this.wheelChairOrCrutchesReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.wheelChairOrCrutchesReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Wheel chair or crutches report with ID ${id} not found`,
      );
    }
    await this.wheelChairOrCrutchesReportRepository.update(id, {
      is_archived: true,
    });
  }

  async removeByDate(date: string): Promise<void> {
    const reports = await this.findByDate(date);
    if (!reports) {
      throw new NotFoundException(
        `Wheel chair or crutches report with date ${date} not found`,
      );
    }
    await this.wheelChairOrCrutchesReportRepository.update(reports[0].id, {
      is_archived: true,
    });
  }
}
