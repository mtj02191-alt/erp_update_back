import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { DonorRelationshipService } from "./donor-relationship.service";
import { CreateDonorInteractionDto } from "./dto/create-interaction.dto";
import { UpdateDonorInteractionDto } from "./dto/update-interaction.dto";
import { RescheduleFollowupDto } from "./dto/reschedule-followup.dto";
import { UpdateDonorFollowupDto } from "./dto/update-followup.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";

@Controller("donor-relationship")
@UseGuards(JwtGuard, PermissionsGuard)
export class DonorRelationshipController {
  constructor(private readonly service: DonorRelationshipService) {}

  @Post("interactions")
  @RequiredPermissions([
    "fund_raising.donor_relationship.create",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async createInteraction(
    @Body() dto: CreateDonorInteractionDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.createInteraction(dto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Interaction recorded",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to record interaction",
        data: null,
      });
    }
  }

  @Get("interactions")
  @RequiredPermissions([
    "fund_raising.donor_relationship.view",
    "fund_raising.donor_relationship.list_view",
    "fund_raising.donors.view",
    "fund_raising.online_donors.view",
    "fund_raising.offline_donors.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getInteractions(
    @Query("donor_id") donorId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.getDonorInteractions(+donorId, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Interactions retrieved",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
        data: [],
      });
    }
  }

  /** My interactions (default) or team interactions when scope=team */
  @Get("my-interactions")
  @RequiredPermissions([
    "fund_raising.donor_relationship.view",
    "fund_raising.donor_relationship.list_view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getMyInteractions(
    @Query("scope") scope: string,
    @Query("activity_type") activityType: string,
    @Query("search") search: string,
    @Query("limit") limit: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.getInteractionsList(
        {
          scope: scope === "team" ? "team" : "mine",
          activity_type: activityType,
          search,
          limit,
        },
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Interactions retrieved",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to load interactions",
        data: { scope: "mine", total: 0, items: [] },
      });
    }
  }

  @Patch("interactions/:id")
  @RequiredPermissions([
    "fund_raising.donor_relationship.update",
    "super_admin",
  ])
  async updateInteraction(
    @Param("id") id: string,
    @Body() dto: UpdateDonorInteractionDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.updateInteraction(+id, dto, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Interaction updated",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to update interaction",
        data: null,
      });
    }
  }

  @Delete("interactions/:id")
  @RequiredPermissions([
    "fund_raising.donor_relationship.delete",
    "super_admin",
  ])
  async deleteInteraction(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.deleteInteraction(+id, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Interaction deleted",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to delete interaction",
        data: null,
      });
    }
  }

  @Get("follow-ups")
  @RequiredPermissions([
    "fund_raising.donor_relationship.list_view",
    "fund_raising.donor_relationship.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getFollowups(
    @Query("bucket") bucket: string,
    @Query("page") page: string,
    @Query("pageSize") pageSize: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.getMyFollowups(user, {
        bucket,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Follow-ups retrieved",
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

  @Patch("follow-ups/:id")
  @RequiredPermissions([
    "fund_raising.donor_relationship.update",
    "super_admin",
  ])
  async updateFollowup(
    @Param("id") id: string,
    @Body() dto: UpdateDonorFollowupDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.updateFollowup(+id, dto, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Follow-up updated",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status || error?.getStatus?.() || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to update follow-up",
        data: null,
      });
    }
  }

  @Patch("follow-ups/:id/complete")
  @RequiredPermissions([
    "fund_raising.donor_relationship.create",
    "fund_raising.donor_relationship.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async completeFollowup(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.completeFollowup(+id, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Follow-up completed",
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

  @Patch("follow-ups/:id/reschedule")
  @RequiredPermissions([
    "fund_raising.donor_relationship.create",
    "fund_raising.donor_relationship.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async rescheduleFollowup(
    @Param("id") id: string,
    @Body() dto: RescheduleFollowupDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.rescheduleFollowup(+id, dto, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Follow-up rescheduled",
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

  @Get("overview")
  @RequiredPermissions([
    "fund_raising.donor_relationship.manage_overview",
    "super_admin",
    "fund_raising_manager",
  ])
  async getOverview(
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.getManagementOverview(user, {
        fromDate,
        toDate,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Overview retrieved",
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

  @Get("assigned-donors")
  @RequiredPermissions([
    "fund_raising.donor_relationship.create",
    "fund_raising.donor_relationship.list_view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getAssignedDonors(@CurrentUser() user: any, @Res() res: Response) {
    try {
      const data = await this.service.getAssignedDonorsForSelect(user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Assigned donors retrieved",
        data,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message,
        data: [],
      });
    }
  }
}
