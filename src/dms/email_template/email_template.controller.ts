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
} from "@nestjs/common";
import { EmailTemplateService } from "./email_template.service";
import { CreateEmailTemplateDto } from "./dto/create-email_template.dto";
import { UpdateEmailTemplateDto } from "./dto/update-email_template.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { EmailService } from "../../email/email.service";

@Controller("email-templates")
@UseGuards(JwtGuard)
export class EmailTemplateController {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  async create(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    const data = await this.emailTemplateService.create(createEmailTemplateDto);
    return { success: true, data };
  }

  @Post(":id/send")
  async sendTemplate(
    @Param("id") id: string,
    @Body("to") to: string,
    @Body("data") data: Record<string, any>,
  ) {
    const template = await this.emailTemplateService.findOne(+id);
    if (!template.is_active) {
      throw new HttpException("Template is inactive", HttpStatus.BAD_REQUEST);
    }

    const sent = await this.emailService.sendDynamicEmail({
      to,
      subject: template.subject,
      body: template.body,
      data,
    });

    if (!sent) {
      throw new HttpException(
        "Failed to send dynamic email",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { success: true, message: "Email sent successfully" };
  }

  @Get()
  async findAll(
    @Query("page") page: number,
    @Query("pageSize") pageSize: number,
    @Query("search") search: string,
    @Query("category") category: string,
  ) {
    const result = await this.emailTemplateService.findAll({
      page,
      pageSize,
      search,
      category,
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
