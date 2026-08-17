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
import { AppealUpdatesService } from "./appeal_updates.service";
import { CreateAppealUpdateDto } from "./dto/create-appeal_update.dto";
import { UpdateAppealUpdateDto } from "./dto/update-appeal_update.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("appeal-updates")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class AppealUpdatesController {
  constructor(private readonly updatesService: AppealUpdatesService) {}

  @Get()
  @RequiredPermissions(["dms.appeals.view", "super_admin"])
  async findByAppeal(
    @Query("appeal_id") appealId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.updatesService.findByAppeal(+appealId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal updates retrieved",
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
  async create(@Body() dto: CreateAppealUpdateDto, @Res() res: Response) {
    try {
      const result = await this.updatesService.create(dto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Appeal update created",
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
    @Body() dto: UpdateAppealUpdateDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.updatesService.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal update saved",
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
      await this.updatesService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal update archived",
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
