import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions";
import { CurrentUser } from "src/auth/current-user.decorator";
import { ProgressBatchesService } from "./progress-batches.service";
import { UpdateWorkflowBatchDto } from "./dto/update-workflow-batch.dto";

@Controller("progress/batches")
@UseGuards(JwtGuard, PermissionsGuard)
export class ProgressBatchesController {
  constructor(private readonly service: ProgressBatchesService) {}

  /**
   * Batch dropdown options for tracker filtering.
   *
   * tracker_status:
   * - open: only batches that have at least one tracker not closed yet (overall_status not completed/cancelled)
   * - closed: only batches where all linked trackers are closed (best-effort)
   * - all: ignore tracker status
   */
  @Get("options")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async options(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Res() res?: Response,
  ) {
    const data = await this.service.listBatchOptions({
      status: (status || "open") as any,
      search: search || undefined,
      limit: 200,
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Batches retrieved",
      data,
    });
  }

  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.donations.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async updateBatch(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowBatchDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.updateWorkflowBatch(Number(id), dto, user);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Batch updated",
      data,
    });
  }
}
