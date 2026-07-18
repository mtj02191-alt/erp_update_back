import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApplicationReport } from "./entities/application-report.entity";
import { CreateApplicationReportDto } from "./dto/create-application-report.dto";
import { UpdateApplicationReportDto } from "./dto/update-application-report.dto";
import { User } from "../../users/user.entity";

/** Fields clients may echo from GET responses; must not be written on update/create. */
function omitApplicationReportImmutableFields(
  app: Record<string, unknown>,
): Record<string, unknown> {
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    created_by: _cb,
    updated_by: _ub,
    is_archived: _ia,
    ...mutable
  } = app;
  return mutable;
}

@Injectable()
export class ApplicationReportsService {
  constructor(
    @InjectRepository(ApplicationReport)
    private applicationReportRepository: Repository<ApplicationReport>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createApplicationReportDto: CreateApplicationReportDto,
    user: any,
  ): Promise<any> {
    try {
      const { applications, ...reportData } = createApplicationReportDto;
      // Fetch the full user entity if needed (optional, if user is not already a full entity)
      const dbUser = user.id
        ? await this.userRepository.findOne({ where: { id: user.id } })
        : null;
      if (!dbUser) throw new BadRequestException("User not found");
      // Create one record for each application
      const createdReports = [];
      for (const app of applications) {
        const appFields = omitApplicationReportImmutableFields(
          app as unknown as Record<string, unknown>,
        );
        const applicationReport = this.applicationReportRepository.create({
          ...reportData,
          ...appFields,
          created_by: dbUser,
          updated_by: dbUser,
          is_archived: false,
        });
        const savedReport =
          await this.applicationReportRepository.save(applicationReport);
        createdReports.push(savedReport);
      }
      // Return data in frontend-expected format
      return {
        id: createdReports[0]?.id || 1,
        report_date: reportData.report_date,
        notes: reportData.notes,
        applications: createdReports.map((report) => ({
          id: report.id,
          project: report.project,
          subprogram: report.subprogram,
          pending_last_month: report.pending_last_month,
          application_count: report.application_count,
          investigation_count: report.investigation_count,
          verified_count: report.verified_count,
          approved_count: report.approved_count,
          rejected_count: report.rejected_count,
          pending_count: report.pending_count,
        })),
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        "Failed to create application report: " + error.message,
      );
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;
      const whereClause = { is_archived: false };
      const queryBuilder = this.applicationReportRepository
        .createQueryBuilder("report")
        .where(whereClause)
        .orderBy(`report.${sortField}`, sortOrder);

      const reports = await queryBuilder.getMany();

      // Group all rows first so pagination/count reflects grouped report records.
      const groupedReports = this.groupReportsByDate(reports);
      const paginatedGroupedReports = groupedReports.slice(
        skip,
        skip + pageSize,
      );
      const total = groupedReports.length;
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: paginatedGroupedReports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch application reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      // Find all reports with the same report_date and notes (grouped reports)
      const report = await this.applicationReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(
          `Application report with ID ${id} not found`,
        );
      }

      // Find all related reports (same date and notes)
      const relatedReports = await this.applicationReportRepository.find({
        where: {
          report_date: report.report_date,
          notes: report.notes,
          is_archived: false,
        },
        order: { id: "ASC" },
      });

      // Return in frontend-expected format
      return {
        id: report.id,
        report_date: report.report_date,
        notes: report.notes,
        applications: relatedReports.map((r) => ({
          id: r.id,
          project: r.project,
          subprogram: r.subprogram,
          pending_last_month: r.pending_last_month,
          application_count: r.application_count,
          investigation_count: r.investigation_count,
          verified_count: r.verified_count,
          approved_count: r.approved_count,
          rejected_count: r.rejected_count,
          pending_count: r.pending_count,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to fetch application report: " + error.message,
      );
    }
  }

  async findLatest(): Promise<any> {
    try {
      const latestRow = await this.applicationReportRepository.findOne({
        where: { is_archived: false },
        order: { created_at: "DESC" },
      });

      if (!latestRow) {
        throw new NotFoundException("No application reports found");
      }

      // Find all related reports (same date and notes)
      const relatedReports = await this.applicationReportRepository.find({
        where: {
          report_date: latestRow.report_date,
          notes: latestRow.notes,
          is_archived: false,
        },
        order: { id: "ASC" },
      });

      return {
        id: latestRow.id,
        report_date: latestRow.report_date,
        notes: latestRow.notes,
        applications: relatedReports.map((r) => ({
          id: r.id,
          project: r.project,
          subprogram: r.subprogram,
          pending_last_month: r.pending_last_month,
          application_count: r.application_count,
          investigation_count: r.investigation_count,
          verified_count: r.verified_count,
          approved_count: r.approved_count,
          rejected_count: r.rejected_count,
          pending_count: r.pending_count,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        "Failed to fetch latest application report: " + error.message,
      );
    }
  }

  async update(
    id: number,
    updateApplicationReportDto: UpdateApplicationReportDto,
    user: User,
  ): Promise<any> {
    try {
      const existingReport = await this.findOne(id);
      const { applications, ...reportData } = updateApplicationReportDto;
      const dbUser = user.id
        ? await this.userRepository.findOne({ where: { id: user.id } })
        : null;
      // Find all related reports to update
      const relatedReports = await this.applicationReportRepository.find({
        where: {
          report_date: existingReport.report_date,
          notes: existingReport.notes,
          is_archived: false,
        },
        order: { id: "ASC" },
      });
      // Submit Report metadata for all related reports
      if (Object.keys(reportData).length > 0) {
        for (const report of relatedReports) {
          await this.applicationReportRepository.update(report.id, {
            ...reportData,
            updated_by: dbUser,
          });
        }
      }
      // Update applications if provided
      if (applications && applications.length > 0) {
        for (
          let i = 0;
          i < Math.max(relatedReports.length, applications.length);
          i++
        ) {
          if (i < applications.length) {
            const app = applications[i];
            const appFields = omitApplicationReportImmutableFields(
              app as unknown as Record<string, unknown>,
            );
            if (i < relatedReports.length) {
              // Update existing record
              await this.applicationReportRepository.update(
                relatedReports[i].id,
                {
                  ...reportData,
                  ...appFields,
                  updated_by: dbUser,
                },
              );
            } else {
              // Create new record if we have more applications than existing records
              const applicationReport = this.applicationReportRepository.create(
                {
                  ...reportData,
                  ...appFields,
                  created_by: dbUser,
                  updated_by: dbUser,
                  is_archived: false,
                },
              );
              await this.applicationReportRepository.save(applicationReport);
            }
          } else {
            // Delete extra records if we have fewer applications than existing records
            await this.applicationReportRepository.remove(relatedReports[i]);
          }
        }
      }
      return this.findOne(id);
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to update application report: " + error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const report = await this.applicationReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(
          `Application report with ID ${id} not found`,
        );
      }
      await this.applicationReportRepository.update(id, { is_archived: true });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to delete application report: " + error.message,
      );
    }
  }

  private groupReportsByDate(reports: ApplicationReport[]): any[] {
    const grouped = new Map<string, any>();

    reports.forEach((report) => {
      const key = `${report.report_date}_${report.notes || ""}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: report.id,
          report_date: report.report_date,
          notes: report.notes,
          applications: [],
        });
      }

      const group = grouped.get(key);
      group.applications.push({
        id: report.id,
        project: report.project,
        subprogram: report.subprogram,
        pending_last_month: report.pending_last_month,
        application_count: report.application_count,
        investigation_count: report.investigation_count,
        verified_count: report.verified_count,
        approved_count: report.approved_count,
        rejected_count: report.rejected_count,
        pending_count: report.pending_count,
      });
    });

    return Array.from(grouped.values());
  }
}
