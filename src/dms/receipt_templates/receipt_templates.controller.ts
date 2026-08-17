import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ReceiptTemplatesService } from "./receipt_templates.service";
import { CreateReceiptTemplateDto } from "./dto/create-receipt_template.dto";
import { UpdateReceiptTemplateDto } from "./dto/update-receipt_template.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("receipt-templates")
@UseGuards(JwtGuard)
export class ReceiptTemplatesController {
  constructor(
    private readonly receiptTemplatesService: ReceiptTemplatesService,
  ) {}

  @Post()
  async create(
    @Body() createReceiptTemplateDto: CreateReceiptTemplateDto,
    @CurrentUser() currentUser: any,
  ) {
    const data = await this.receiptTemplatesService.create(
      createReceiptTemplateDto,
      currentUser,
    );
    return { success: true, data };
  }

  @Get()
  async findAll(
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("search") search: string,
    @CurrentUser() currentUser: any,
  ) {
    const result = await this.receiptTemplatesService.findAll(
      { page, pageSize, search },
      currentUser,
    );
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() currentUser: any) {
    const data = await this.receiptTemplatesService.findOne(+id);
    const scope =
      await this.receiptTemplatesService.resolveReceiptTemplateScope(
        currentUser,
      );
    try {
      this.receiptTemplatesService.assertReceiptTemplateAccess(scope, data);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw error;
    }
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateReceiptTemplateDto: UpdateReceiptTemplateDto,
    @CurrentUser() currentUser: any,
  ) {
    const existing = await this.receiptTemplatesService.findOne(+id);
    const scope =
      await this.receiptTemplatesService.resolveReceiptTemplateScope(
        currentUser,
      );
    this.receiptTemplatesService.assertReceiptTemplateAccess(scope, existing);

    const data = await this.receiptTemplatesService.update(
      +id,
      updateReceiptTemplateDto,
      currentUser,
    );
    return { success: true, data };
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() currentUser: any) {
    const existing = await this.receiptTemplatesService.findOne(+id);
    const scope =
      await this.receiptTemplatesService.resolveReceiptTemplateScope(
        currentUser,
      );
    this.receiptTemplatesService.assertReceiptTemplateAccess(scope, existing);

    await this.receiptTemplatesService.remove(+id);
    return { success: true, message: "Receipt template removed successfully" };
  }
}
