import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AppealsBenificiariesService } from "./appeals_benificiaries.service";
import { CreateAppealsBenificiaryDto } from "./dto/create-appeals_benificiary.dto";
import { UpdateAppealsBenificiaryDto } from "./dto/update-appeals_benificiary.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("appeals-benificiaries")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class AppealsBenificiariesController {
  constructor(
    private readonly beneficiariesService: AppealsBenificiariesService,
  ) {}

  @Post()
  @RequiredPermissions(["dms.appeals.create", "super_admin"])
  async create(@Body() dto: CreateAppealsBenificiaryDto, @Res() res: Response) {
    try {
      const result = await this.beneficiariesService.create(dto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Beneficiary created",
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

  @Get(":id")
  @RequiredPermissions(["dms.appeals.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.beneficiariesService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Beneficiary retrieved",
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
  @RequiredPermissions(["dms.appeals.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAppealsBenificiaryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.beneficiariesService.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Beneficiary updated",
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
      await this.beneficiariesService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Beneficiary archived",
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
