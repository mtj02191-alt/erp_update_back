import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WaterReport } from "./entities/water-report.entity";
import { CreateWaterReportDto } from "./dto/create-water-report.dto";
import { UpdateWaterReportDto } from "./dto/update-water-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class WaterReportsService {
  constructor(
    @InjectRepository(WaterReport)
    private readonly waterReportRepository: Repository<WaterReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateWaterReportDto,
    user: User,
  ): Promise<WaterReport> {
    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    const report = this.waterReportRepository.create({
      date: new Date(createDto.date),
      activity: createDto.activity,
      system: createDto.system,
      quantity: createDto.quantity || 0,
      created_by: dbUser,
      updated_by: dbUser,
    });
    return await this.waterReportRepository.save(report);
  }

  async createMultiple(
    createDtos: CreateWaterReportDto[],
  ): Promise<WaterReport[]> {
    const reports = createDtos.map((dto) =>
      this.waterReportRepository.create({
        date: new Date(dto.date),
        activity: dto.activity,
        system: dto.system,
        quantity: dto.quantity || 0,
      }),
    );

    return await this.waterReportRepository.save(reports);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.waterReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.waterReportRepository.count({
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
            activities: [],
          };
        }

        acc[dateKey].activities.push({
          id: report.id,
          activity: report.activity,
          system: report.system,
          quantity: report.quantity,
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
        "Failed to fetch water reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<WaterReport> {
    const report = await this.waterReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Water report with ID ${id} not found`);
    }
    return report;
  }

  async findByDate(date: string): Promise<WaterReport[]> {
    return await this.waterReportRepository.find({
      where: { date: new Date(date) },
      order: { id: "ASC" },
    });
  }

  async update(
    id: number,
    updateDto: UpdateWaterReportDto,
  ): Promise<WaterReport> {
    const report = await this.waterReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Water report with ID ${id} not found`);
    }

    if (updateDto.date) {
      report.date = updateDto.date;
    }
    if (updateDto.activity) {
      report.activity = updateDto.activity;
    }
    if (updateDto.system) {
      report.system = updateDto.system;
    }
    if (updateDto.quantity !== undefined) {
      report.quantity = updateDto.quantity;
    }

    return await this.waterReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.waterReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Water report with ID ${id} not found`);
    }
    await this.waterReportRepository.update(id, { is_archived: true });
  }

  async removeByDate(date: string): Promise<void> {
    const reports = await this.findByDate(date);
    if (!reports) {
      throw new NotFoundException(`Water report with date ${date} not found`);
    }
    await this.waterReportRepository.update(reports[0].id, {
      is_archived: true,
    });
  }
}
