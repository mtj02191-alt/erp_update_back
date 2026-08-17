import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { JwtGuard } from "../../auth/jwt.guard";
import {
  AID_APPLICATIONS_CEO_GUARD,
  AID_APPLICATIONS_CREATE_GUARD,
  AID_APPLICATIONS_DELETE_GUARD,
  AID_APPLICATIONS_DELIVER_GUARD,
  AID_APPLICATIONS_LIST_GUARD,
  AID_APPLICATIONS_UPDATE_GUARD,
  AID_APPLICATIONS_VIEW_GUARD,
  AID_PEOPLE_UPDATE_GUARD,
  AID_PEOPLE_VIEW_GUARD,
} from "../../permissions/aid-permissions.constants";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { AidAttachmentContext } from "./aid.enums";
import { AidApplicationsService } from "./aid-applications.service";
import {
  CeoDecideAidApplicationDto,
  CreateAidApplicationDto,
  DeliverAidApplicationDto,
  RejectAidApplicationDto,
  UpdateAidApplicationDto,
  VerifyAidApplicationDto,
} from "./dto/aid.dto";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller("aid/applications")
@UseGuards(JwtGuard, PermissionsGuard)
export class AidApplicationsController {
  constructor(private readonly applicationsService: AidApplicationsService) {}

  @Post()
  @RequiredPermissions([...AID_APPLICATIONS_CREATE_GUARD])
  async create(
    @Body() dto: CreateAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.create(dto, req?.user);
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Application created",
      data,
    });
  }

  @Get()
  @RequiredPermissions([...AID_APPLICATIONS_LIST_GUARD])
  async findAll(
    @Query("search") search: string,
    @Query("status") status: string,
    @Query("page") page: string,
    @Query("pageSize") pageSize: string,
    @Res() res: Response,
  ) {
    const result = await this.applicationsService.findAll({
      search,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Applications retrieved",
      ...result,
    });
  }

  @Get("person/:personId/attachments")
  @RequiredPermissions([...AID_PEOPLE_VIEW_GUARD])
  async personAttachments(
    @Param("personId") personId: string,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.listPersonAttachments(
      Number(personId),
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Attachments retrieved",
      data,
    });
  }

  @Post("person/:personId/attachments/upload")
  @RequiredPermissions([...AID_PEOPLE_UPDATE_GUARD])
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  async uploadPersonAttachment(
    @Param("personId") personId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("context") context: string,
    @Body("description") description: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "file is required",
      });
    }
    const ctx = (Object.values(AidAttachmentContext) as string[]).includes(
      context,
    )
      ? (context as AidAttachmentContext)
      : AidAttachmentContext.PROFILE;

    const data = await this.applicationsService.addAttachment({
      applicationId: null,
      personId: Number(personId),
      context: ctx,
      file,
      description,
      user: req?.user,
    });
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Attachment uploaded",
      data,
    });
  }

  @Delete("attachments/:attachmentId")
  @RequiredPermissions([...AID_APPLICATIONS_UPDATE_GUARD])
  async deleteAttachment(
    @Param("attachmentId") attachmentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.deleteAttachment(
      Number(attachmentId),
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Attachment removed",
      data,
    });
  }

  @Get(":id")
  @RequiredPermissions([...AID_APPLICATIONS_VIEW_GUARD])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    const data = await this.applicationsService.findOne(Number(id));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Application retrieved",
      data,
    });
  }

  @Patch(":id")
  @RequiredPermissions([...AID_APPLICATIONS_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.update(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Application updated",
      data,
    });
  }

  @Post(":id/reject")
  @RequiredPermissions([...AID_APPLICATIONS_UPDATE_GUARD])
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.reject(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Application rejected",
      data,
    });
  }

  @Post(":id/verify")
  @RequiredPermissions([...AID_APPLICATIONS_UPDATE_GUARD])
  async verify(
    @Param("id") id: string,
    @Body() dto: VerifyAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.markVerified(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Verification recorded — awaiting CEO approval",
      data,
    });
  }

  @Post(":id/ceo-decide")
  @RequiredPermissions([...AID_APPLICATIONS_CEO_GUARD])
  async ceoDecide(
    @Param("id") id: string,
    @Body() dto: CeoDecideAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.ceoDecide(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "CEO decision recorded",
      data,
    });
  }

  @Post(":id/delivery")
  @RequiredPermissions([...AID_APPLICATIONS_DELIVER_GUARD])
  async delivery(
    @Param("id") id: string,
    @Body() dto: DeliverAidApplicationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const data = await this.applicationsService.markDelivery(
      Number(id),
      dto,
      req?.user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Delivery status updated",
      data,
    });
  }

  @Post(":id/attachments/upload")
  @RequiredPermissions([...AID_APPLICATIONS_UPDATE_GUARD])
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  async uploadAttachment(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("context") context: string,
    @Body("description") description: string,
    @Body("person_id") personId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "file is required",
      });
    }
    const ctx = (Object.values(AidAttachmentContext) as string[]).includes(
      context,
    )
      ? (context as AidAttachmentContext)
      : AidAttachmentContext.VERIFICATION;

    const data = await this.applicationsService.addAttachment({
      applicationId: Number(id),
      personId: personId ? Number(personId) : null,
      context: ctx,
      file,
      description,
      user: req?.user,
    });
    return res.status(HttpStatus.CREATED).json({
      success: true,
      message: "Attachment uploaded",
      data,
    });
  }

  @Delete(":id")
  @RequiredPermissions([...AID_APPLICATIONS_DELETE_GUARD])
  async remove(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const data = await this.applicationsService.softDelete(Number(id), req?.user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Application archived",
      data,
    });
  }
}
