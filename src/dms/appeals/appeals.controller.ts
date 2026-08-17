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
  Req,
  HttpStatus,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { AppealsService } from "./appeals.service";
import {
  AppealImagePurpose,
  S3StorageService,
} from "../../utils/storage/s3-storage.service";
import { CreateAppealDto } from "./dto/create-appeal.dto";
import { UpdateAppealDto } from "./dto/update-appeal.dto";
import { AppealFiltersDto } from "./dto/appeal-filters.dto";
import { SetAppealStatusDto } from "./dto/set-status.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";
import { APPEALS_OPTIONS_GUARD } from "../../utils/lookup";
import { JwtGuard } from "../../auth/jwt.guard";

const APPEAL_IMAGE_PURPOSES = new Set<AppealImagePurpose>([
  "cover",
  "organizer",
  "beneficiary",
  "gallery",
]);

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller("appeals")
export class AppealsController {
  constructor(
    private readonly appealsService: AppealsService,
    private readonly s3Storage: S3StorageService,
  ) {}

  /** Upload a single image to S3; returns public URL for appeal form fields. */
  @Post("upload/image")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions([
    "dms.appeals.create",
    "dms.appeals.update",
    "fund_raising.appeals.create",
    "fund_raising.appeals.update",
    "super_admin",
  ])
  @UseInterceptors(FileInterceptor("file", imageUploadOptions))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query("purpose") purpose: string,
    @Res() res: Response,
  ) {
    try {
      const p = (purpose || "gallery").toLowerCase() as AppealImagePurpose;
      if (!APPEAL_IMAGE_PURPOSES.has(p)) {
        throw new BadRequestException(
          "purpose must be cover, organizer, beneficiary, or gallery",
        );
      }
      const result = await this.s3Storage.uploadAppealImage(file, p);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Image uploaded successfully",
        data: result,
      });
    } catch (error: any) {
      const status =
        error.status || error.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /** Upload multiple gallery images (max 10). */
  @Post("upload/images")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions([
    "dms.appeals.create",
    "dms.appeals.update",
    "fund_raising.appeals.create",
    "fund_raising.appeals.update",
    "super_admin",
  ])
  @UseInterceptors(FilesInterceptor("files", 10, imageUploadOptions))
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      if (!files?.length) {
        throw new BadRequestException("No files uploaded");
      }
      const uploads = await Promise.all(
        files.map((f) => this.s3Storage.uploadAppealImage(f, "gallery")),
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Images uploaded successfully",
        data: uploads,
      });
    } catch (error: any) {
      const status =
        error.status || error.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.create", "fund_raising.appeals.create", "super_admin"])
  async create(
    @Body() dto: CreateAppealDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.appealsService.create(dto, userId);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Appeal created successfully",
        data: result,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /** Slim id/title list for filters (e.g. donations list). */
  @Get("options")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...APPEALS_OPTIONS_GUARD])
  async options(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Res() res?: Response,
  ) {
    try {
      const data = await this.appealsService.listForOptions({
        search,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal options retrieved",
        data,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.list_view", "fund_raising.appeals.list_view", "super_admin"])
  async findAll(@Query() filters: AppealFiltersDto, @Res() res: Response) {
    try {
      const result = await this.appealsService.findAll(filters);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeals retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get(":id")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.view", "fund_raising.appeals.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.appealsService.findByIdOrSlug(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.update", "fund_raising.appeals.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAppealDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.appealsService.update(+id, dto, userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal updated successfully",
        data: result,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id/status")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.update", "fund_raising.appeals.update", "super_admin"])
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetAppealStatusDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.appealsService.setStatus(
        +id,
        dto.status,
        userId,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal status updated",
        data: result,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.appeals.delete", "fund_raising.appeals.delete", "super_admin"])
  async archive(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    try {
      const userId = req?.user?.id ?? null;
      await this.appealsService.archive(+id, userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal archived successfully",
        data: null,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
