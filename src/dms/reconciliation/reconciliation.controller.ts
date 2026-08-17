import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { ReconciliationService } from "./reconciliation.service";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
};

@Controller("reconciliation")
@UseGuards(JwtGuard, PermissionsGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post("upload")
  @RequiredPermissions([
    "fund_raising.reconciliation.create",
    "super_admin",
    "fund_raising_manager",
  ])
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("bank") bank: string,
    @Query("notes") notes: string,
    @CurrentUser() currentUser: any,
    @Res() res: Response,
  ) {
    try {
      if (!bank?.trim()) {
        throw new BadRequestException("Query parameter 'bank' is required");
      }
      if (!file) {
        throw new BadRequestException("File is required");
      }

      const result = await this.reconciliationService.processUpload({
        bankName: bank,
        file,
        userId: currentUser?.id,
        notes,
      });

      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Reconciliation completed",
        data: result.reconciliation,
        summary: result.summary,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Reconciliation failed",
        data: null,
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "fund_raising.reconciliation.list_view",
    "fund_raising.reconciliation.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findAll(
    @Query("bank") bank?: string,
    @Query("userId") userId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.reconciliationService.findAll({
        bankName: bank,
        userId: userId ? parseInt(userId, 10) : undefined,
        fromDate,
        toDate,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Reconciliation records retrieved",
        ...result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "fund_raising.reconciliation.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.reconciliationService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Reconciliation record retrieved",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
        data: null,
      });
    }
  }
}
