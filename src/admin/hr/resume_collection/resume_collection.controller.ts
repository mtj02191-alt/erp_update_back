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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";

import { FileInterceptor } from "@nestjs/platform-express";

import { memoryStorage } from "multer";

import { ResumeCollectionService } from "./resume_collection.service";

import { CreateResumeCollectionDto } from "./dto/create-resume_collection.dto";

import { UpdateResumeCollectionDto } from "./dto/update-resume_collection.dto";

import { JwtGuard } from "../../../auth/jwt.guard";

import { CurrentUser } from "../../../auth/current-user.decorator";

import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";

import { RequiredPermissions } from "../../../permissions";

import { Department } from "../../../users/user.entity";



const resumeUploadOptions = {

  storage: memoryStorage(),

  limits: { fileSize: 5 * 1024 * 1024 },

};



@Controller("resume-collection")

@UseGuards(JwtGuard, PermissionsGuard)

export class ResumeCollectionController {

  constructor(

    private readonly resumeCollectionService: ResumeCollectionService,

  ) {}



  @Post("analyze")
  @RequiredPermissions(["hr.resume_collection.create", "super_admin"])
  @UseInterceptors(FileInterceptor("resume", resumeUploadOptions))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      const data = await this.resumeCollectionService.analyzeFile(file);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error: any) {
      const status =
        error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      const responseBody = error?.getResponse?.() ?? error?.response;
      const message =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.message ||
            error?.message ||
            "Failed to analyze resume";
      return res.status(status).json({
        success: false,
        message: Array.isArray(message) ? message.join(", ") : message,
        data: null,
      });
    }
  }

  @Post()
  @RequiredPermissions(["hr.resume_collection.create", "super_admin"])

  @UseInterceptors(FileInterceptor("resume", resumeUploadOptions))

  async create(
    @Body() dto: CreateResumeCollectionDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: any,
    @Res() res: Response,
  ) {
    try {
      const hasStagedUpload =
        Boolean(dto.resume_url?.trim()) && Boolean(dto.resume_file_key?.trim());

      if (!file?.buffer?.length && !hasStagedUpload) {
        throw new BadRequestException("Resume file is required");
      }

      const data = await this.resumeCollectionService.create(
        dto,
        file?.buffer?.length ? file : undefined,
        currentUser,
      );
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error: any) {
      const status =
        error?.status || error?.statusCode || HttpStatus.BAD_REQUEST;
      const responseBody = error?.getResponse?.() ?? error?.response;
      const message =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.message || error?.message || "Failed to upload resume";
      return res.status(status).json({
        success: false,
        message: Array.isArray(message) ? message.join(", ") : message,
        data: null,
      });
    }
  }



  @Get()

  @RequiredPermissions([

    "hr.resume_collection.list_view",

    "hr.resume_collection.view",

    "super_admin",

  ])

  async findAll(

    @Query("page") page?: string,

    @Query("pageSize") pageSize?: string,

    @Query("search") search?: string,

    @Query("applicant_name") applicant_name?: string,

    @Query("phone") phone?: string,
    @Query("email") email?: string,
    @Query("cnic") cnic?: string,
    @Query("address") address?: string,
    @Query("city") city?: string,
    @Query("role") role?: string,
    @Query("experience") experience?: string,
    @Query("education") education?: string,
    @Query("department") department?: Department,
    @Query("notes") notes?: string,
  ) {
    const result = await this.resumeCollectionService.findAll({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      search,
      applicant_name,
      phone,
      email,
      cnic,
      address,
      city,
      role,
      experience,
      education,
      department,
      notes,
    });

    return { success: true, ...result };

  }



  @Get(":id/file")
  @RequiredPermissions([
    "hr.resume_collection.view",
    "hr.resume_collection.list_view",
    "super_admin",
  ])
  async getResumeFile(
    @Param("id") id: string,
    @Query("disposition") disposition: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.resumeCollectionService.getResumeFileBuffer(+id);
    const disp = disposition === "attachment" ? "attachment" : "inline";
    const safeName = String(filename || "resume").replace(/"/g, "");
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `${disp}; filename="${safeName}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }

  @Get(":id")
  @RequiredPermissions([
    "hr.resume_collection.view",
    "hr.resume_collection.list_view",
    "super_admin",
  ])
  async findOne(@Param("id") id: string) {
    const data = await this.resumeCollectionService.findOne(+id);
    return { success: true, data };
  }



  @Patch(":id")

  @RequiredPermissions(["hr.resume_collection.update", "super_admin"])

  @UseInterceptors(FileInterceptor("resume", resumeUploadOptions))

  async update(

    @Param("id") id: string,

    @Body() dto: UpdateResumeCollectionDto,

    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() currentUser: any,

  ) {

    const data = await this.resumeCollectionService.update(

      +id,

      dto,

      file,

      currentUser,

    );

    return { success: true, data };

  }



  @Delete(":id")

  @RequiredPermissions(["hr.resume_collection.delete", "super_admin"])

  async remove(@Param("id") id: string) {

    await this.resumeCollectionService.remove(+id);

    return { success: true, message: "Resume removed from collection" };

  }

}

