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
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventFiltersDto } from "./dto/event-filters.dto";
import { SetEventStatusDto } from "./dto/set-event-status.dto";
import { ScanPassDto } from "./dto/scan-pass.dto";
import { PassesQueryDto } from "./dto/passes-query.dto";
import { GeneratePassesQueryDto } from "./dto/generate-passes-query.dto";
import { EventDonationsReportQueryDto } from "./dto/donations-report-query.dto";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.create", "super_admin"])
  async create(
    @Body() dto: CreateEventDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.eventsService.create(dto, userId);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Event created successfully",
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
  @RequiredPermissions(["dms.events.list_view", "super_admin"])
  async findAll(@Query() filters: EventFiltersDto, @Res() res: Response) {
    try {
      const result = await this.eventsService.findAll(filters);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Events retrieved successfully",
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

  @Get(":eventId/stats")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.view", "super_admin"])
  async getStats(@Param("eventId") eventId: string, @Res() res: Response) {
    try {
      const result = await this.eventsService.getStats(+eventId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event stats retrieved",
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

  @Get(":eventId/donations-report")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.view", "super_admin"])
  async getDonationsReport(
    @Param("eventId") eventId: string,
    @Query() query: EventDonationsReportQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.eventsService.getDonationsReport(
        +eventId,
        query.from,
        query.to,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event donations report retrieved",
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

  @Get(":eventId/passes")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.view", "super_admin"])
  async listPasses(
    @Param("eventId") eventId: string,
    @Query() query: PassesQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.eventsService.listPasses(+eventId, query);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Passes retrieved",
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Post(":eventId/passes/generate")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.update", "super_admin"])
  async generatePasses(
    @Param("eventId") eventId: string,
    @Query() query: GeneratePassesQueryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.eventsService.generatePasses(
        +eventId,
        query.count,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: `${result.length} passes generated`,
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

  @Post(":eventId/passes/scan")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.update", "super_admin"])
  async scanPass(
    @Param("eventId") eventId: string,
    @Body() dto: ScanPassDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.eventsService.scanPass(+eventId, dto, userId);
      if (result.ok) {
        return res.status(HttpStatus.OK).json({
          success: true,
          ok: true,
          attendees_count: result.attendees_count,
          allowed_attendees: result.allowed_attendees,
          remaining: result.remaining,
        });
      }
      const failResult = result as {
        ok: false;
        code: string;
        used_at?: string;
      };
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        ok: false,
        code: failResult.code,
        ...(failResult.used_at && { used_at: failResult.used_at }),
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        ok: false,
        code: "ERROR",
        message: error.message,
      });
    }
  }

  @Patch(":eventId/passes/:passId/revoke")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.events.update", "super_admin"])
  async revokePass(
    @Param("eventId") eventId: string,
    @Param("passId") passId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.eventsService.revokePass(+eventId, +passId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Pass revoked",
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
  @RequiredPermissions(["dms.events.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.eventsService.getDetailWithRemaining(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event retrieved successfully",
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
  @RequiredPermissions(["dms.events.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.eventsService.update(+id, dto, userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event updated successfully",
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
  @RequiredPermissions(["dms.events.update", "super_admin"])
  async setStatus(
    @Param("id") id: string,
    @Body() dto: SetEventStatusDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id ?? null;
      const result = await this.eventsService.setStatus(
        +id,
        dto.status,
        userId,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event status updated",
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
  @RequiredPermissions(["dms.events.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.eventsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event archived successfully",
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
