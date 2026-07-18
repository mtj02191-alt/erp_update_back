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
import { AccountsAndFinanceService } from "./services/accounts-and-finance.service";
import { CreateAccountsAndFinanceDto } from "./dto/create-accounts-and-finance.dto/create-accounts-and-finance.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions/decorators/require-permission.decorator";

@Controller("accounts-and-finance")
@UseGuards(JwtGuard, PermissionsGuard)
export class AccountsAndFinanceController {
  constructor(
    private readonly accountsAndFinanceService: AccountsAndFinanceService,
  ) {}

  @Post()
  @RequiredPermissions(["accounts_and_finance.create"])
  create(@Body() createDto: CreateAccountsAndFinanceDto) {
    return this.accountsAndFinanceService.create(createDto);
  }

  @Get()
  findAll() {
    return this.accountsAndFinanceService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.accountsAndFinanceService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDto: Partial<CreateAccountsAndFinanceDto>,
  ) {
    return this.accountsAndFinanceService.update(+id, updateDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.accountsAndFinanceService.remove(+id);
  }
}
