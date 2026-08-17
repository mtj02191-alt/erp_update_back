import {
  Body,
  Controller,
  Delete,
  Get,
  ForbiddenException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Response, Request } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import {
  DONATION_CREATE_GUARD,
  DONATION_UPDATE_GUARD,
  DONATION_VIEW_GUARD,
  RequiredPermissions,
} from "src/permissions";
import { CurrentUser } from "src/auth/current-user.decorator";
import { UserOrDonorJwtGuard } from "src/auth/guards/user-or-donor-jwt.guard";
import { PermissionsService } from "src/permissions/permissions.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Donation } from "src/donations/entities/donation.entity";

import { ProgressTrackersService } from "./progress-trackers.service";
import { CreateTrackerDto } from "./dto/create-tracker.dto";
import { UpdateTrackerDto } from "./dto/update-tracker.dto";
import { UpdateTrackerStepStatusDto } from "./dto/update-tracker-step-status.dto";
import { AddEvidenceDto } from "./dto/add-evidence.dto";
import { AllocateTrackerPartsDto } from "./dto/allocate-tracker-parts.dto";

@Controller("progress/trackers")
export class ProgressTrackersController {
  constructor(
    private readonly service: ProgressTrackersService,
    private readonly permissionsService: PermissionsService,
    @InjectRepository(Donation)
    private readonly donationsRepo: Repository<Donation>,
  ) {}

  private async assertStaffHasAnyPermission(user: any, perms: string[]) {
    if (!user?.id) throw new ForbiddenException("Authentication required");
    if (user.id === -1) return;
    // Allow role match (legacy behavior in PermissionsGuard)
    for (const perm of perms) {
      if (
        user.role &&
        String(user.role).toLowerCase() === String(perm).toLowerCase()
      ) {
        return;
      }
    }
    for (const perm of perms) {
      const ok = await this.permissionsService.hasPermission(
        Number(user.id),
        perm,
      );
      if (ok) return;
    }
    throw new ForbiddenException("Insufficient permissions");
  }

  @Post()
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_CREATE_GUARD])
  async create(
    @Body() dto: CreateTrackerDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.createTrackerFromTemplate(dto, user);
    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Tracker created", data });
  }

  @Get()
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_VIEW_GUARD])
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("template_id") template_id?: string,
    @Query("donation_id") donation_id?: string,
    @Query("batch_id") batch_id?: string,
    @Query("batch_number") batch_number?: string,
    @Query("batch_status") batch_status?: string,
    @Res() res?: Response,
  ) {
    const data = await this.service.listTrackers({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      search,
      template_id: template_id ? parseInt(template_id, 10) : undefined,
      donation_id: donation_id ? parseInt(donation_id, 10) : undefined,
      batch_id: batch_id ? parseInt(batch_id, 10) : undefined,
      batch_number: batch_number ? parseInt(batch_number, 10) : undefined,
      batch_status:
        batch_status === "open" || batch_status === "closed"
          ? (batch_status as any)
          : undefined,
    });
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Trackers retrieved", ...data });
  }

  /** Must be registered before @Get(":id") so "by-donation" is not captured as an id. */
  @Get("by-donation/:donationId")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_VIEW_GUARD])
  async byDonation(
    @Param("donationId") donationId: string,
    @Res() res: Response,
  ) {
    const trackers = await this.service.getAllTrackersByDonationId(+donationId);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: trackers.length
        ? "Trackers retrieved"
        : "No trackers for this donation",
      data: { trackers },
    });
  }

  @Get(":id")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_VIEW_GUARD])
  async detail(@Param("id") id: string, @Res() res: Response) {
    const data = await this.service.getTrackerDetail(+id);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Tracker retrieved", data });
  }

  @Patch(":id")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTrackerDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.updateTracker(+id, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Tracker updated", data });
  }

  @Post(":id/token")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async regenToken(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.generateOrRegenerateToken(+id, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Token generated", data });
  }

  @Post(":id/allocate-parts")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async allocateParts(
    @Param("id") id: string,
    @Body() dto: AllocateTrackerPartsDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.allocateMoreParts(
      Number(id),
      Number(dto?.parts_requested || 0),
      user,
    );
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Parts allocated", data });
  }

  @Get(":id/steps")
  @UseGuards(UserOrDonorJwtGuard)
  async listSteps(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const trackerId = Number(id);
    const staffUser = (req as any).user;
    const donorPayload = (req as any).donor;

    if (staffUser?.id) {
      await this.assertStaffHasAnyPermission(staffUser, [
        ...DONATION_VIEW_GUARD,
      ]);
      const data = await this.service.listSteps(trackerId);
      return res
        .status(HttpStatus.OK)
        .json({ success: true, message: "Tracker steps retrieved", data });
    }

    if (donorPayload?.donor_id) {
      const tracker = await this.service.getTrackerDetail(trackerId);
      if ((tracker as any)?.donor_visible === false) {
        throw new ForbiddenException("Access denied");
      }

      // Ownership check: tracker must be attached to a donation owned by this donor
      const donationId = Number((tracker as any)?.donation_id || 0);
      if (!donationId) throw new ForbiddenException("Access denied");

      const donation = await this.donationsRepo.findOne({
        where: { id: donationId } as any,
        select: ["id", "donor_id", "donation_method"] as any,
      });
      if (!donation) throw new ForbiddenException("Access denied");
      if (
        Number((donation as any).donor_id) !== Number(donorPayload.donor_id)
      ) {
        throw new ForbiddenException("Access denied");
      }
      if (String((donation as any).donation_method || "") === "in_kind") {
        throw new ForbiddenException("Access denied");
      }

      const steps = ((tracker as any).steps || []).filter(
        (s: any) => s?.donor_visible === true && s?.is_archived !== true,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tracker steps retrieved",
        data: steps,
      });
    }

    throw new ForbiddenException("Authentication required");
  }

  @Patch("steps/:stepId")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async updateStep(
    @Param("stepId") stepId: string,
    @Body() dto: UpdateTrackerStepStatusDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.updateStep(+stepId, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Tracker step updated", data });
  }

  @Post("steps/:stepId/evidence")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async addEvidence(
    @Param("stepId") stepId: string,
    @Body() dto: AddEvidenceDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.addEvidence(+stepId, dto, user);
    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Evidence added", data });
  }

  @Patch("evidence/:evidenceId")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async updateEvidence(
    @Param("evidenceId") evidenceId: string,
    @Body() dto: Partial<AddEvidenceDto>,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.updateEvidence(+evidenceId, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Evidence updated", data });
  }

  @Delete("evidence/:evidenceId")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async archiveEvidence(
    @Param("evidenceId") evidenceId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.archiveEvidence(+evidenceId, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Evidence archived", data });
  }
}

@Controller("progress/public")
export class ProgressPublicController {
  constructor(private readonly service: ProgressTrackersService) {}

  @Get(":token")
  async getPublic(@Param("token") token: string, @Res() res: Response) {
    const data = await this.service.getPublicTrackingByToken(token);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Public tracking retrieved", data });
  }
}
