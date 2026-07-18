import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { AccountsAndFinanceDailyReportsService } from "./accounts-and-finance-daily-reports.service";
import { CreateAccountsAndFinanceDailyReportDto } from "./dto/create-accounts-and-finance-daily-report.dto";
import { UpdateAccountsAndFinanceDailyReportDto } from "./dto/update-accounts-and-finance-daily-report.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";

@Controller("accounts-and-finance/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class AccountsAndFinanceDailyReportsController {
  constructor(
    private readonly accountsAndFinanceDailyReportsService: AccountsAndFinanceDailyReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "accounts_and_finance.reports.create",
    "super_admin",
    "accounts_and_finance_manager",
  ])
  create(@Body() createDto: CreateAccountsAndFinanceDailyReportDto) {
    return this.accountsAndFinanceDailyReportsService.create(createDto);
  }

  @Get()
  @RequiredPermissions([
    "accounts_and_finance.reports.list_view",
    "super_admin",
    "accounts_and_finance_manager",
  ])
  findAll() {
    return this.accountsAndFinanceDailyReportsService.findAll();
  }

  @Get(":id")
  @RequiredPermissions([
    "accounts_and_finance.reports.view",
    "super_admin",
    "accounts_and_finance_manager",
  ])
  findOne(@Param("id") id: string) {
    return this.accountsAndFinanceDailyReportsService.findOne(+id);
  }

  @Patch(":id")
  @RequiredPermissions([
    "accounts_and_finance.reports.update",
    "super_admin",
    "accounts_and_finance_manager",
  ])
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateAccountsAndFinanceDailyReportDto,
  ) {
    return this.accountsAndFinanceDailyReportsService.update(+id, updateDto);
  }

  @Delete(":id")
  @RequiredPermissions([
    "accounts_and_finance.reports.delete",
    "super_admin",
    "accounts_and_finance_manager",
  ])
  remove(@Param("id") id: string) {
    return this.accountsAndFinanceDailyReportsService.remove(+id);
  }
}
