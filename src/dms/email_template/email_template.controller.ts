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
  HttpStatus,
  HttpException,
  Req,
} from "@nestjs/common";
import { EmailTemplateService } from "./email_template.service";
import { CreateEmailTemplateDto } from "./dto/create-email_template.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email_template.dto";
import {
  PreviewTemplateDto,
  SendTemplateBulkDto,
  TestSendTemplateDto,
  ResolveAudienceDto,
} from "./dto/template-send.dto";
import { JwtGuard } from "../../auth/jwt.guard";

@Controller("email-templates")
@UseGuards(JwtGuard)
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get("metadata")
  getMetadata() {
    return {
      success: true,
      data: this.emailTemplateService.getMetadata(),
    };
  }

  @Get("communication-batches")
  findBatches(
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("template_id") template_id: number,
    @Query("channel") channel: string,
    @Query("batch_status") batch_status: string,
    @Query("send_source") send_source: string,
  ) {
    return this.emailTemplateService
      .findBatches({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
        template_id: template_id ? Number(template_id) : undefined,
        channel,
        batch_status,
        send_source: send_source || undefined,
      })
      .then((result) => ({ success: true, ...result }));
  }

  @Get("communication-batches/:batchId")
  async findBatchOne(@Param("batchId") batchId: string) {
    const data = await this.emailTemplateService.findBatchOne(+batchId);
    return { success: true, data };
  }

  @Post("resolve-audience")
  async resolveAudience(@Body() dto: ResolveAudienceDto, @Req() req: any) {
    const data = await this.emailTemplateService.resolveAudience(
      req?.user,
      dto,
    );
    return { success: true, data };
  }

  @Get("communication-logs")
  findLogs(
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("donor_id") donor_id: number,
    @Query("template_id") template_id: number,
    @Query("batch_id") batch_id: number,
    @Query("channel") channel: string,
    @Query("delivery_status") delivery_status: string,
  ) {
    return this.emailTemplateService
      .findLogs({
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
        donor_id: donor_id ? Number(donor_id) : undefined,
        template_id: template_id ? Number(template_id) : undefined,
        batch_id: batch_id ? Number(batch_id) : undefined,
        channel,
        delivery_status,
      })
      .then((result) => ({ success: true, ...result }));
  }

  @Post()
  async create(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    const data = await this.emailTemplateService.create(createEmailTemplateDto);
    return { success: true, data };
  }

  @Post(":id/preview")
  async preview(@Param("id") id: string, @Body() dto: PreviewTemplateDto) {
    const data = await this.emailTemplateService.preview(
      +id,
      dto.sample_data || {},
    );
    return { success: true, data };
  }

  @Post(":id/preview/:donorId")
  async previewForDonor(
    @Param("id") id: string,
    @Param("donorId") donorId: string,
    @Body() dto: PreviewTemplateDto,
  ) {
    const data = await this.emailTemplateService.previewForDonor(
      +id,
      +donorId,
      dto.sample_data || {},
    );
    return { success: true, data };
  }

  @Post(":id/test-send")
  async testSend(@Param("id") id: string, @Body() dto: TestSendTemplateDto) {
    const data = await this.emailTemplateService.sendTest(
      +id,
      dto.channel,
      dto.recipient,
      dto.sample_data || {},
    );
    return { success: data.success, data };
  }

  @Post(":id/send-bulk")
  async sendBulk(
    @Param("id") id: string,
    @Body() dto: SendTemplateBulkDto,
    @Req() req: any,
  ) {
    const data = await this.emailTemplateService.sendBulk(
      +id,
      dto,
      req?.user?.id ?? null,
      req?.user,
    );
    return { success: true, data };
  }

  @Post(":id/send")
  async sendTemplate(
    @Param("id") id: string,
    @Body("to") to: string,
    @Body("data") data: Record<string, any>,
  ) {
    const result = await this.emailTemplateService.sendTest(
      +id,
      "email",
      to,
      data || {},
    );
    if (!result.success) {
      throw new HttpException(
        result.message || "Failed to send email",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { success: true, message: "Email sent successfully" };
  }

  @Get("suggested-cta/:id")
  async suggestedCta(@Param("id") id: string) {
    const template = await this.emailTemplateService.findOne(+id);
    const url = await this.emailTemplateService.resolveSuggestedCtaUrl(template);
    return { success: true, data: { cta_url: url } };
  }

  @Get()
  async findAll(
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("search") search: string,
    @Query("category") category: string,
    @Query("channels") channels: string,
    @Query("purposes") purposes: string,
    @Query("statuses") statuses: string,
  ) {
    const result = await this.emailTemplateService.findAll({
      page,
      pageSize,
      search,
      category,
      channels,
      purposes,
      statuses,
    });
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.emailTemplateService.findOne(+id);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
  ) {
    const data = await this.emailTemplateService.update(
      +id,
      updateEmailTemplateDto,
    );
    return { success: true, data };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.emailTemplateService.remove(+id);
    return { success: true, message: "Template removed successfully" };
  }
}
