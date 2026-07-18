import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions";
import { ProgressNotificationLog } from "./progress_notification_log.entity";

@Controller("progress/notifications")
@UseGuards(JwtGuard, PermissionsGuard)
export class ProgressNotificationsController {
  constructor(
    @InjectRepository(ProgressNotificationLog)
    private readonly logsRepo: Repository<ProgressNotificationLog>,
  ) {}

  @Get("tracker/:trackerId")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async listByTracker(
    @Param("trackerId") trackerId: string,
    @Query("limit") limit?: string,
    @Res() res?: Response,
  ) {
    const take = Math.min(parseInt(limit || "50", 10) || 50, 200);
    const data = await this.logsRepo.find({
      where: { tracker_id: +trackerId },
      order: { created_at: "DESC" },
      take,
    });
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Notification logs retrieved", data });
  }
}
