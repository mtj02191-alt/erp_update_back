import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KasbReport } from "./entities/kasb-report.entity";
import { CreateKasbReportDto } from "./dto/create-kasb-report.dto";
import { UpdateKasbReportDto } from "./dto/update-kasb-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class KasbReportsService {
  constructor(
    @InjectRepository(KasbReport)
    private readonly kasbReportRepository: Repository<KasbReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateKasbReportDto,
    user: User,
  ): Promise<KasbReport> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.kasbReportRepository.create({
        date: new Date(createDto.date),
        center: createDto.center,
        delivery: createDto.delivery || 0,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.kasbReportRepository.save(report);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createMultiple(
    createDtos: CreateKasbReportDto[],
  ): Promise<KasbReport[]> {
    const reports = createDtos.map((dto) =>
      this.kasbReportRepository.create({
        date: new Date(dto.date),
        center: dto.center,
        delivery: dto.delivery || 0,
      }),
    );

    return await this.kasbReportRepository.save(reports);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.kasbReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.kasbReportRepository.count({
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
            centers: [],
          };
        }

        acc[dateKey].centers.push({
          id: report.id,
          center: report.center,
          delivery: report.delivery,
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
        "Failed to fetch kasb reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<KasbReport> {
    const report = await this.kasbReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Kasb report with ID ${id} not found`);
    }
    return report;
  }

  async findByDate(date: string): Promise<KasbReport[]> {
    return await this.kasbReportRepository.find({
      where: { date: new Date(date) },
      order: { id: "ASC" },
    });
  }

  async update(
    id: number,
    updateDto: UpdateKasbReportDto,
  ): Promise<KasbReport> {
    const report = await this.findOne(id);

    if (updateDto.date) {
      report.date = updateDto.date;
    }
    if (updateDto.center) {
      report.center = updateDto.center;
    }
    if (updateDto.delivery !== undefined) {
      report.delivery = updateDto.delivery;
    }

    return await this.kasbReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.findOne(id);
    if (!report) {
      throw new NotFoundException(`Kasb report with ID ${id} not found`);
    }
    await this.kasbReportRepository.update(id, { is_archived: true });
  }

  async removeByDate(date: string): Promise<void> {
    const reports = await this.findByDate(date);
    if (!reports || reports.length === 0) {
      throw new NotFoundException(`Kasb report with date ${date} not found`);
    }

    // Archive all rows for the given date.
    await Promise.all(
      reports.map((report) =>
        this.kasbReportRepository.update(report.id, { is_archived: true }),
      ),
    );
  }
}
