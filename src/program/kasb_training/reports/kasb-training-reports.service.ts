import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KasbTrainingReport } from "./entities/kasb-training-report.entity";
import { CreateKasbTrainingReportDto } from "./dto/create-kasb-training-report.dto";
import { UpdateKasbTrainingReportDto } from "./dto/update-kasb-training-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class KasbTrainingReportsService {
  constructor(
    @InjectRepository(KasbTrainingReport)
    private readonly kasbTrainingReportRepository: Repository<KasbTrainingReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateKasbTrainingReportDto,
    user: User,
  ): Promise<KasbTrainingReport> {
    try {
      // Calculate total
      const quantity = createDto.quantity || 0;
      const addition = createDto.addition || 0;
      const left = createDto.left || 0;
      const total = quantity + addition - left;
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.kasbTrainingReportRepository.create({
        date: new Date(createDto.date),
        skill_level: createDto.skill_level,
        quantity: quantity,
        addition: addition,
        left: left,
        total: total,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.kasbTrainingReportRepository.save(report);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createMultiple(
    createDtos: CreateKasbTrainingReportDto[],
    user: User,
  ): Promise<KasbTrainingReport[]> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      const reports = createDtos.map((dto) => {
        const quantity = dto.quantity || 0;
        const addition = dto.addition || 0;
        const left = dto.left || 0;
        const total = quantity + addition - left;

        return this.kasbTrainingReportRepository.create({
          date: new Date(dto.date),
          skill_level: dto.skill_level,
          quantity,
          addition,
          left,
          total,
          created_by: dbUser,
          updated_by: dbUser,
        });
      });

      return await this.kasbTrainingReportRepository.save(reports);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(): Promise<KasbTrainingReport[]> {
    return await this.kasbTrainingReportRepository.find({
      where: { is_archived: false },
      order: { date: "DESC", id: "ASC" },
    });
  }

  async findOne(id: number): Promise<KasbTrainingReport> {
    const report = await this.kasbTrainingReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Kasb training report with ID ${id} not found`,
      );
    }
    return report;
  }

  async update(
    id: number,
    updateDto: UpdateKasbTrainingReportDto,
  ): Promise<KasbTrainingReport> {
    const report = await this.kasbTrainingReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Kasb training report with ID ${id} not found`,
      );
    }

    if (updateDto.date) {
      report.date = updateDto.date;
    }
    if (updateDto.skill_level) {
      report.skill_level = updateDto.skill_level;
    }
    if (updateDto.quantity !== undefined) {
      report.quantity = updateDto.quantity;
    }
    if (updateDto.addition !== undefined) {
      report.addition = updateDto.addition;
    }
    if (updateDto.left !== undefined) {
      report.left = updateDto.left;
    }

    // Recalculate total
    report.total = report.quantity + report.addition - report.left;

    return await this.kasbTrainingReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.kasbTrainingReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Kasb training report with ID ${id} not found`,
      );
    }
    await this.kasbTrainingReportRepository.update(id, { is_archived: true });
  }

  async findByDate(date: string): Promise<KasbTrainingReport[]> {
    return await this.kasbTrainingReportRepository.find({
      where: { date: new Date(date), is_archived: false },
      order: { id: "ASC" },
    });
  }

  async removeByDate(date: string): Promise<void> {
    const reports = await this.findByDate(date);
    if (!reports || reports.length === 0) {
      throw new NotFoundException(
        `Kasb training reports with date ${date} not found`,
      );
    }

    await Promise.all(
      reports.map((report) =>
        this.kasbTrainingReportRepository.update(report.id, {
          is_archived: true,
        }),
      ),
    );
  }
}
