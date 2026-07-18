import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountsAndFinanceDailyReportEntity } from "./entities/accounts-and-finance-daily-report.entity";
import { CreateAccountsAndFinanceDailyReportDto } from "./dto/create-accounts-and-finance-daily-report.dto";
import { UpdateAccountsAndFinanceDailyReportDto } from "./dto/update-accounts-and-finance-daily-report.dto";

@Injectable()
export class AccountsAndFinanceDailyReportsService {
  private readonly logger = new Logger(
    AccountsAndFinanceDailyReportsService.name,
  );

  constructor(
    @InjectRepository(AccountsAndFinanceDailyReportEntity)
    private accountsAndFinanceDailyReportRepository: Repository<AccountsAndFinanceDailyReportEntity>,
  ) {}

  async create(createDto: CreateAccountsAndFinanceDailyReportDto) {
    try {
      this.logger.log(
        `Creating new accounts and finance daily report for date: ${createDto.date}`,
      );

      const entity =
        this.accountsAndFinanceDailyReportRepository.create(createDto);
      const result =
        await this.accountsAndFinanceDailyReportRepository.save(entity);

      this.logger.log(
        `Successfully created accounts and finance daily report with ID: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create accounts and finance daily report: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to create accounts and finance daily report",
      );
    }
  }

  async findAll() {
    try {
      this.logger.log("Fetching all accounts and finance daily reports");

      const reports = await this.accountsAndFinanceDailyReportRepository.find({
        order: { date: "DESC", created_at: "DESC" },
        where: { is_archived: false },
      });

      this.logger.log(
        `Successfully fetched ${reports.length} accounts and finance daily reports`,
      );
      return reports;
    } catch (error) {
      this.logger.error(
        `Failed to fetch accounts and finance daily reports: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to fetch accounts and finance daily reports",
      );
    }
  }

  async findOne(id: number) {
    try {
      this.logger.log(
        `Fetching accounts and finance daily report with ID: ${id}`,
      );

      const report = await this.accountsAndFinanceDailyReportRepository.findOne(
        {
          where: { id, is_archived: false },
        },
      );

      if (!report) {
        this.logger.warn(
          `Accounts and finance daily report with ID ${id} not found`,
        );
        throw new NotFoundException(
          `Accounts and finance daily report with ID ${id} not found`,
        );
      }

      this.logger.log(
        `Successfully fetched accounts and finance daily report with ID: ${id}`,
      );
      return report;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch accounts and finance daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to fetch accounts and finance daily report",
      );
    }
  }

  async update(id: number, updateDto: UpdateAccountsAndFinanceDailyReportDto) {
    try {
      this.logger.log(
        `Updating accounts and finance daily report with ID: ${id}`,
      );

      // First check if the record exists
      await this.findOne(id);

      // Update the record
      await this.accountsAndFinanceDailyReportRepository.update(id, updateDto);

      // Fetch and return the updated record
      const updatedReport = await this.findOne(id);

      this.logger.log(
        `Successfully updated accounts and finance daily report with ID: ${id}`,
      );
      return updatedReport;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update accounts and finance daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to update accounts and finance daily report",
      );
    }
  }

  async remove(id: number) {
    try {
      this.logger.log(
        `Deleting accounts and finance daily report with ID: ${id}`,
      );

      // First check if the record exists
      const report = await this.findOne(id);
      if (!report) {
        throw new NotFoundException(
          `Accounts and finance daily report with ID ${id} not found`,
        );
      }
      // Remove the record
      const result = await this.accountsAndFinanceDailyReportRepository.update(
        id,
        { is_archived: true },
      );

      this.logger.log(
        `Successfully deleted accounts and finance daily report with ID: ${id}`,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete accounts and finance daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Failed to delete accounts and finance daily report",
      );
    }
  }
}
