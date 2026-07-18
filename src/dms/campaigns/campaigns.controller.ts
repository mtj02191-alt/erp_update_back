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
} from "@nestjs/common";
import { Response } from "express";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { CampaignFiltersDto } from "./dto/campaign-filters.dto";
import { SetCampaignStatusDto } from "./dto/set-status.dto";
import { CampaignReportQueryDto } from "./dto/report-query.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // —— Admin CRUD ——

  @Post()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.campaigns.create", "super_admin"])
  async create(
    @Body() dto: CreateCampaignDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.campaignsService.create(dto, userId);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Campaign created successfully",
        data: result,
      });
    } catch (error) {
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

  @Get()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.campaigns.list_view", "super_admin"])
  async findAll(@Query() filters: CampaignFiltersDto, @Res() res: Response) {
    try {
      const result = await this.campaignsService.findAll(filters);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaigns retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get(":id/report")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.campaigns.view", "super_admin"])
  async getReport(
    @Param("id") id: string,
    @Query() query: CampaignReportQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.campaignsService.getReport(
        +id,
        query.from,
        query.to,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign report retrieved",
        data: result,
      });
    } catch (error) {
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

  @Get(":id")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.campaigns.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.campaignsService.findByIdOrSlug(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign retrieved successfully",
        data: result,
      });
    } catch (error) {
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
  @RequiredPermissions(["dms.campaigns.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.campaignsService.update(+id, dto, userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign updated successfully",
        data: result,
      });
    } catch (error) {
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
  @RequiredPermissions(["dms.campaigns.update", "super_admin"])
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetCampaignStatusDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.campaignsService.setStatus(
        +id,
        dto.status,
        userId,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign status updated",
        data: result,
      });
    } catch (error) {
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
  @RequiredPermissions(["dms.campaigns.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.campaignsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign archived successfully",
        data: null,
      });
    } catch (error) {
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
