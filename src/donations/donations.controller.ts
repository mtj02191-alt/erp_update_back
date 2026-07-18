import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Res,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { FilterPayload } from "../utils/filters/common-filter.util";
import { Response } from "express";
import { DonationsService } from "./donations.service";
import { CreateDonationDto } from "./dto/create-donation.dto";
import { UpdateDonationDto } from "./dto/update-donation.dto";
import { UpdateDonationStatusDto } from "./dto/update-donation-status.dto";
import { UpdateDonationNoteDto } from "./dto/update-donation-note.dto";
import { CurrentUser } from "src/auth/current-user.decorator";
import { ConditionalJwtGuard } from "src/auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions";
import { PermissionsService } from "src/permissions/permissions.service";
import { JwtGuard } from "src/auth/jwt.guard";
import { DonationsReceiptsService } from "./receipts.service";
import { UserOrDonorJwtGuard } from "src/auth/guards/user-or-donor-jwt.guard";
import { DonorService } from "src/dms/donor/donor.service";

@Controller("donations")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly permissionsService: PermissionsService,
    private readonly receiptsService: DonationsReceiptsService,
    private readonly donorService: DonorService,
  ) {}

  /**
   * Determine if a donation is "online" based on donation_source.
   * Online = 'website', everything else = offline.
   */
  private isOnlineDonation(donationSource: string | null | undefined): boolean {
    return donationSource === "website";
  }

  /**
   * Runtime permission check for online/offline donations.
   * Checks: super_admin OR fund_raising_manager OR the specific online/offline permission.
   */
  private async checkDonationPermission(
    userId: number,
    donationSource: string | null | undefined,
    action: string,
  ): Promise<void> {
    // Super admin and user id -1 bypass
    if (userId === -1) return;

    const hasSuperAdmin = await this.permissionsService.hasPermission(
      userId,
      "super_admin",
    );
    if (hasSuperAdmin) return;

    const hasFundRaisingManager = await this.permissionsService.hasPermission(
      userId,
      "fund_raising_manager",
    );
    if (hasFundRaisingManager) return;

    const submodule = this.isOnlineDonation(donationSource)
      ? "online_donations"
      : "offline_donations";
    const permissionPath = `fund_raising.${submodule}.${action}`;

    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      permissionPath,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions for ${submodule.replace("_", " ")}`,
      );
    }
  }

  /**
   * Check if user has permission for at least one donation type (online or offline).
   * Returns which types the user can access.
   */
  private async getDonationSourceAccess(
    userId: number,
    action: string,
  ): Promise<{ online: boolean; offline: boolean }> {
    if (userId === -1) return { online: true, offline: true };

    const hasSuperAdmin = await this.permissionsService.hasPermission(
      userId,
      "super_admin",
    );
    if (hasSuperAdmin) return { online: true, offline: true };

    const hasFundRaisingManager = await this.permissionsService.hasPermission(
      userId,
      "fund_raising_manager",
    );
    if (hasFundRaisingManager) return { online: true, offline: true };

    const hasOnline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.online_donations.${action}`,
    );
    const hasOffline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.offline_donations.${action}`,
    );

    return { online: hasOnline, offline: hasOffline };
  }

  /**
   * Check if a donation falls within the user's assigned geography.
   * For online donations (website) → checks donation.city
   * For offline donations → checks the donor's city
   * Throws ForbiddenException if the user has geographic restrictions and the donation is outside their area.
   */
  private async checkGeographicAccess(
    userId: number,
    donation: {
      city?: string | null;
      donation_source?: string | null;
      donor_id?: number | null;
      donor?: any;
    },
  ): Promise<void> {
    if (!userId || userId === -1) return;

    const assignedCityNames =
      await this.donationsService.resolveUserGeography(userId);
    // null means no geographic restrictions
    if (assignedCityNames === null) return;

    let cityToCheck: string | null | undefined = null;

    if (donation.donation_source === "website") {
      // Online donation — check donation's own city
      cityToCheck = donation.city;
    } else {
      // Offline donation — check the donor's city
      cityToCheck = donation.donor?.city || null;

      // If donor is not loaded/joined, fetch donor city by donor_id
      if (!cityToCheck && donation.donor_id) {
        const donorCity = await this.donationsService.getDonorCityById(
          donation.donor_id,
        );
        cityToCheck = donorCity;
      }
    }

    // If no city to check (neither on donation nor donor), allow access
    if (!cityToCheck) return;

    const normalizedCity = cityToCheck.toLowerCase().trim();
    if (!assignedCityNames.includes(normalizedCity)) {
      throw new ForbiddenException(
        "You do not have geographic access to this donation",
      );
    }
  }

  @Post()
  async create(
    @Body() createDonationDto: CreateDonationDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          createDonationDto.donation_source,
          "create",
        );
      }

      console.log("donation api called________________________");
      const result = await this.donationsService.create(
        createDonationDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Donation created successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("options")
  @UseGuards(JwtGuard)
  async getDonationOptions(
    @Query("status") status?: string,
    @Query("payment_method") paymentMethod?: string,
  ) {
    return this.donationsService.getDonationListForDropdown({
      status: status || undefined,
      paymentMethod: paymentMethod || undefined,
    });
  }

  @Post(":id/process-batching")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions([
    "fund_raising.donations.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async processBatching(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.donationsService.processBatchingForDonationManual(
      +id,
      user,
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Batching processed",
      data,
    });
  }

  @Post("search")
  async findAll(@Body() payload: any, @Res() res: Response, @Req() req: any) {
    try {
      const user = req?.user ?? null;

      // Determine which donation sources the user can view
      let sourceAccess = { online: true, offline: true };
      if (user?.id) {
        sourceAccess = await this.getDonationSourceAccess(user.id, "list_view");
        if (!sourceAccess.online && !sourceAccess.offline) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: "Insufficient permissions to view donations",
            data: [],
            pagination: null,
          });
        }
      }

      // Extract pagination and sorting
      const pagination = payload.pagination || {};
      const page = pagination.page || 1;
      let pageSize = pagination.pageSize || 10;
      if (pagination.pageSize == 0) {
        pageSize = 0;
      }

      const sortField = pagination.sortField || "created_at";
      const sortOrder = pagination.sortOrder || "DESC";

      // Extract filters
      const filters = payload.filters || {};

      // Inject donation_source filter based on user permissions
      if (!sourceAccess.online && sourceAccess.offline) {
        // User can only see offline donations (everything except 'website')
        filters._donation_source_not = "website";
      } else if (sourceAccess.online && !sourceAccess.offline) {
        // User can only see online donations
        filters.donation_source = "website";
      }
      // If both are true, no filter needed (user can see everything)

      // Resolve user's geographic assignments to city name strings for filtering
      let assignedCityNames: string[] | null = null;
      if (user?.id && user.id !== -1) {
        assignedCityNames = await this.donationsService.resolveUserGeography(
          user.id,
        );
      }

      // Extract hybrid filters and convert to new format
      const hybridFilters = payload.hybrid_filters || [];

      // Extract Relations filters
      const relationsFilters = payload.relationsFilters || [];

      // Build complete filters object
      const completeFilters: FilterPayload = {
        ...filters,
      };

      const result = await this.donationsService.findAll(
        page,
        pageSize,
        sortField,
        sortOrder,
        completeFilters,
        hybridFilters,
        payload?.multiselectFilters || [],
        relationsFilters,
        user,
        assignedCityNames,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donations retrieved successfully",
        ...result,
      });
    } catch (error) {
      console.error("Donations search error:", error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get(":id/provider-status")
  async getProviderStatus(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      // First fetch the donation to check its source
      const donation = await this.donationsService.findOne(+id);
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          donation.donation_source,
          "view",
        );
        await this.checkGeographicAccess(user.id, donation);
      }

      const result = await this.donationsService.getProviderStatus(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Provider status retrieved successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
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
  async findOne(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const result = await this.donationsService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          result.donation_source,
          "view",
        );
        await this.checkGeographicAccess(user.id, result);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation retrieved successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Donor-portal safe donation view.
   * - Allows either staff jwt cookie OR donor_jwt cookie.
   * - If donor: must own the donation (donation.donor_id === donor_id) and excludes in_kind donations.
   */
  @Get(":id/portal-view")
  @UseGuards(UserOrDonorJwtGuard)
  async portalView(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const donationId = Number(id);
      if (!donationId || Number.isNaN(donationId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid donation id",
          data: null,
        });
      }

      // Always load with tracker relation (donor portal needs tracking)
      const donation =
        await this.donationsService.findOneWithProgressTracker(donationId);

      // Staff flow (existing permission logic)
      if (req?.user?.id) {
        await this.checkDonationPermission(
          req.user.id,
          donation.donation_source,
          "view",
        );
        await this.checkGeographicAccess(req.user.id, donation);
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Donation retrieved successfully",
          data: donation,
        });
      }

      // Donor flow (strict)
      if (req?.donor?.donor_id) {
        const donor = await this.donorService.findOne(
          Number(req.donor.donor_id),
        );
        if (!donor) {
          return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Donor not found",
            data: null,
          });
        }

        if (
          String(donation.donation_method || "").toLowerCase() === "in_kind"
        ) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: "In-kind donation is not available in donor portal",
            data: null,
          });
        }

        if (Number(donation.donor_id) !== Number(donor.id)) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: "You do not have access to this donation",
            data: null,
          });
        }

        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Donation retrieved successfully",
          data: donation,
        });
      }

      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Failed to retrieve donation",
        data: null,
      });
    }
  }

  @Post("sendDonationReceipt/:id")
  async sendDonationReceipt(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const donationId = Number(id);
      if (!donationId || Number.isNaN(donationId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid donation id",
          data: null,
        });
      }

      const user = req?.user ?? null;
      const donation = await this.donationsService.findOne(donationId);

      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          donation.donation_source,
          "view",
        );
        await this.checkGeographicAccess(user.id, donation);
      }

      const sent = await this.receiptsService.sendDonationReceipt(donation);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: sent
          ? "Donation receipt sent successfully"
          : "Donation receipt not sent",
        data: { sent },
      });
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error?.message?.includes("not found")
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
  async update(
    @Param("id") id: string,
    @Body() updateDonationDto: UpdateDonationDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      // Fetch existing donation to check its source
      const existing = await this.donationsService.findOne(+id);
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          existing.donation_source,
          "update",
        );
        await this.checkGeographicAccess(user.id, existing);
      }

      const result = await this.donationsService.update(+id, updateDonationDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation updated successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id/note")
  async updateNote(
    @Param("id") id: string,
    @Body() updateDonationNoteDto: UpdateDonationNoteDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      const existing = await this.donationsService.findOne(+id);
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          existing.donation_source,
          "update",
        );
        await this.checkGeographicAccess(user.id, existing);
      }

      const result = await this.donationsService.updateNote(
        +id,
        updateDonationNoteDto.note ?? null,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation note updated successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error.message.includes("not found")
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
  async remove(@Param("id") id: string, @Res() res: Response, @Req() req: any) {
    try {
      const user = req?.user ?? null;
      const existing = await this.donationsService.findOne(+id);
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          existing.donation_source,
          "delete",
        );
        await this.checkGeographicAccess(user.id, existing);
      }

      const result = await this.donationsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation deleted successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("status")
  async updateDonationStatus(@Body() payload: any, @Res() res: Response) {
    try {
      console.log("Donation status update payload:", payload);

      const result = await this.donationsService.updateDonationFromPublic(
        payload.id,
        payload.order_id,
        payload.status,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation status updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error updating donation status:", error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("status-action")
  async updateStatusAction(
    @Body() updateStatusDto: UpdateDonationStatusDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      // Fetch donation to check source
      const existing = await this.donationsService.findOne(
        updateStatusDto.donation_id,
      );
      if (user?.id) {
        await this.checkDonationPermission(
          user.id,
          existing.donation_source,
          "update",
        );
        await this.checkGeographicAccess(user.id, existing);
      }

      console.log("Donation status action payload:", updateStatusDto);

      const result = await this.donationsService.updateStatusAction(
        updateStatusDto.donation_id,
        updateStatusDto.status,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: {
          donation: result.donation,
          updated: result.updated,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
        },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      console.error("Error updating donation status action:", error);
      const status = error.message.includes("not found")
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
