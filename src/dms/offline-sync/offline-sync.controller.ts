import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { OfflineSyncService } from "./offline-sync.service";
import { OfflineSyncBatchDto } from "./dto/offline-sync.dto";

@Controller("dms/sync")
@UseGuards(JwtGuard, PermissionsGuard)
export class OfflineSyncController {
  constructor(private readonly offlineSyncService: OfflineSyncService) {}

  @Post("offline")
  async syncOffline(
    @Body() dto: OfflineSyncBatchDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.offlineSyncService.processBatch(
        dto,
        req?.user ?? null,
      );
      return res.status(HttpStatus.OK).json({
        success: result.success,
        message:
          result.failed > 0
            ? `Synced ${result.synced}; ${result.failed} failed`
            : `Synced ${result.synced} record(s)`,
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Offline sync failed",
        data: null,
      });
    }
  }
}
