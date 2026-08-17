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
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AppealMediaService } from "./appeal_media.service";
import { CreateAppealMediaDto } from "./dto/create-appeal_media.dto";
import { UpdateAppealMediaDto } from "./dto/update-appeal_media.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("appeal-media")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class AppealMediaController {
  constructor(private readonly mediaService: AppealMediaService) {}

  @Get()
  @RequiredPermissions(["dms.appeals.view", "super_admin"])
  async findByAppeal(
    @Query("appeal_id") appealId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mediaService.findByAppeal(+appealId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal media retrieved",
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

  @Post()
  @RequiredPermissions(["dms.appeals.update", "super_admin"])
  async create(@Body() dto: CreateAppealMediaDto, @Res() res: Response) {
    try {
      const result = await this.mediaService.create(dto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Appeal media created",
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions(["dms.appeals.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAppealMediaDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mediaService.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal media saved",
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
  @RequiredPermissions(["dms.appeals.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.mediaService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal media archived",
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
