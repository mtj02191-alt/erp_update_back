import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Res,
  Req,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { DonorService } from "./donor.service";
import { CreateDonorDto } from "./dto/create-donor.dto";
import { UpdateDonorDto } from "./dto/update-donor.dto";
import { ChangePipelineStageDto } from "./dto/change-pipeline-stage.dto";
// import { ChangePasswordDto } from './dto/change-password.dto';
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { PermissionsService } from "../../permissions/permissions.service";
import { GeographicScopeService } from "../../permissions/geographic-scope/geographic-scope.service";
import { JwtGuard } from "src/auth/jwt.guard";
import { DONOR_PIPELINE_STAGES } from "./pipeline/donor-pipeline.constants";

@Controller("donors")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class DonorController {
  constructor(
    private readonly donorService: DonorService,
    private readonly permissionsService: PermissionsService,
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  /**
   * Determine if a donor is "online" based on source.
   * Online = 'website', everything else = offline.
   */
  private isOnlineDonor(source: string | null | undefined): boolean {
    return source === "website";
  }

  /**
   * Runtime permission check for online/offline donors.
   */
  private async checkDonorPermission(
    userId: number,
    donorSource: string | null | undefined,
    action: string,
  ): Promise<void> {
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

    const hasUnifiedDonors = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.donors.${action}`,
    );
    if (hasUnifiedDonors) return;

    const submodule = this.isOnlineDonor(donorSource)
      ? "online_donors"
      : "offline_donors";
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
   * Check which donor types the user can access.
   */
  private async getDonorSourceAccess(
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

    const hasUnifiedDonors = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.donors.${action}`,
    );
    if (hasUnifiedDonors) return { online: true, offline: true };

    const hasOnline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.online_donors.${action}`,
    );
    const hasOffline = await this.permissionsService.hasPermission(
      userId,
      `fund_raising.offline_donors.${action}`,
    );

    return { online: hasOnline, offline: hasOffline };
  }

  private async resolveGeoScope(user: {
    id?: number;
    role?: string;
    department?: string;
    assigned_countries?: number[] | null;
    assigned_regions?: number[] | null;
    assigned_districts?: number[] | null;
    assigned_tehsils?: number[] | null;
    assigned_cities?: number[] | null;
    assigned_routes?: number[] | null;
    geographic_off?: boolean;
  } | null) {
    if (!user?.id || user.id === -1) return null;
    return this.geographicScopeService.resolveForUser(
      user.id,
      user.role,
      user as any,
    );
  }

  @Post("register")
  async register(
    @Body() createDonorDto: CreateDonorDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const user = req?.user ?? null;
      if (user?.id) {
        await this.checkDonorPermission(
          user.id,
          createDonorDto.source,
          "create",
        );
      }
      const result = await this.donorService.register(createDonorDto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Donor registered successfully",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      const status = error.message.includes("already exists")
        ? HttpStatus.CONFLICT
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
    @Query("donor_type") donor_type?: string,
    @Query("city") city?: string,
    @Query("country") country?: string,
    @Query("is_active") is_active?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Query("multi_time_donors") multi_time_donor?: string,
    @Query("recurring") recurring?: string,
    @Query("donation_type") donation_type?: string,
    @Query("is_mature_donor") is_mature_donor?: string,
    @Query("source") source?: string,
    @Query("donated_amount") donated_amount?: string,
    @Query("donated_amount_operator") donated_amount_operator?: string,
    @Query("pipeline_stage") pipeline_stage?: string,
    @Query("team_filter") team_filter?: string,
    @Query("team_filter_user_id") team_filter_user_id?: string,
    @Req() req?: any,
    @Res() res?: Response,
  ) {
    try {
      const user = req?.user ?? null;

      // Determine which donor sources the user can view
      let sourceAccess = { online: true, offline: true };
      if (user?.id) {
        sourceAccess = await this.getDonorSourceAccess(user.id, "list_view");
        if (!sourceAccess.online && !sourceAccess.offline) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: "Insufficient permissions to view donors",
            data: [],
            pagination: null,
          });
        }
      }

      const donorSourceFilter = source?.toLowerCase().trim();
      const requestedSource =
        donorSourceFilter === "online" || donorSourceFilter === "offline"
          ? donorSourceFilter
          : undefined;

      if (requestedSource === "online" && !sourceAccess.online) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: "Insufficient permissions to filter online donors",
          data: [],
          pagination: null,
        });
      }
      if (requestedSource === "offline" && !sourceAccess.offline) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: "Insufficient permissions to filter offline donors",
          data: [],
          pagination: null,
        });
      }

      const geoScope = await this.resolveGeoScope(user);

      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      let recurringFilter: boolean | undefined =
        recurring === "true"
          ? true
          : recurring === "false"
            ? false
            : undefined;
      // Donation Type dropdown maps to the same recurring flag
      if (recurringFilter === undefined && donation_type) {
        const dt = donation_type.toLowerCase().trim();
        if (dt === "recurring_donor") recurringFilter = true;
        else if (dt === "one_time_donor") recurringFilter = false;
      }

      const result = await this.donorService.findAll(
        {
          page: pageNum,
          pageSize: pageSizeNum,
          sortField,
          sortOrder,
          search,
          donor_type,
          city,
          country,
          is_active: is_active ? is_active === "true" : undefined,
          start_date,
          end_date,
          multi_time_donor: multi_time_donor
            ? multi_time_donor === "true"
            : undefined,
          recurring: recurringFilter,
          is_mature_donor:
            is_mature_donor === "true"
              ? true
              : is_mature_donor === "false"
                ? false
                : undefined,
          source: requestedSource,
          donated_amount,
          donated_amount_operator,
          pipeline_stage:
            pipeline_stage &&
            DONOR_PIPELINE_STAGES.includes(pipeline_stage as any)
              ? pipeline_stage
              : undefined,
          team_filter,
          team_filter_user_id,
        },
        geoScope,
        sourceAccess,
        user,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donors retrieved successfully",
        ...result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: error.message,
          data: [],
          pagination: null,
        });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get("pipeline/summary")
  async getPipelineSummary(@Req() req: any, @Res() res: Response) {
    try {
      const user = req?.user ?? null;
      let sourceAccess = { online: true, offline: true };
      if (user?.id) {
        sourceAccess = await this.getDonorSourceAccess(user.id, "list_view");
        if (!sourceAccess.online && !sourceAccess.offline) {
          return res.status(HttpStatus.FORBIDDEN).json({
            success: false,
            message: "Insufficient permissions to view donors",
            data: null,
          });
        }
      }
      const geoScope = await this.resolveGeoScope(user);
      const data = await this.donorService.getPipelineSummary(
        geoScope,
        sourceAccess,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Pipeline summary retrieved successfully",
        data,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("lookup")
  async findByEmailOrPhone(
    @Query("email") email?: string,
    @Query("phone") phone?: string,
    @Req() req?: any,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.donorService.findByEmailOrPhone(email, phone);
      if (result && req?.user?.id) {
        await this.checkDonorPermission(req.user.id, result.source, "view");
        const geoScope = await this.resolveGeoScope(req.user);
        const scope = await this.donorService.resolveDonorScope(req.user);
        this.donorService.assertDonorViewAccess(scope, result, geoScope);
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result ? "Donor retrieved successfully" : "No donor found",
        data: result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id/pipeline-history")
  async getPipelineHistory(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "view");
      }
      const history = await this.donorService.getPipelineHistory(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor pipeline history retrieved successfully",
        data: history,
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

  @Post(":id/pipeline-stage")
  async changePipelineStage(
    @Param("id") id: string,
    @Body() dto: ChangePipelineStageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "update");
      }
      const data = await this.donorService.changePipelineStage(+id, dto, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Pipeline stage updated successfully",
        data,
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

  @Get(":id/audit-history")
  async getAuditHistory(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "view");
      }
      const history = await this.donorService.getDonorAuditHistory(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor audit history retrieved successfully",
        data: history,
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
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, result, geoScope);
        await this.checkDonorPermission(user.id, result.source, "view");
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor retrieved successfully",
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

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDonorDto: UpdateDonorDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "update");
      }
      const result = await this.donorService.update(+id, updateDonorDto, user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donor updated successfully",
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
  async remove(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "delete");
      }
      const result = await this.donorService.remove(+id, req.user);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: null,
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

  @Post(":id/change-password")
  async changePassword(
    @Param("id") id: string,
    @Body() changePasswordDto: any,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const existing = await this.donorService.findOne(+id);
      const user = req?.user ?? null;
      if (user?.id) {
        const geoScope = await this.resolveGeoScope(user);
        const scope = await this.donorService.resolveDonorScope(user);
        this.donorService.assertDonorViewAccess(scope, existing, geoScope);
        await this.checkDonorPermission(user.id, existing.source, "update");
      }
      const result = await this.donorService.changePassword(
        +id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res
          .status(HttpStatus.FORBIDDEN)
          .json({ success: false, message: error.message, data: null });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * Admin-only: reveal donor password (decrypt Option C storage).
   * Keep this strictly restricted and auditable.
   */
  @Get(":id/reveal-password")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions(["super_admin", "fund_raising_manager"])
  async revealPassword(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const donorId = Number(id);
      if (!donorId || Number.isNaN(donorId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid donor id",
          data: null,
        });
      }

      // Ensure requester can view this donor type + geo
      const donor = await this.donorService.findOne(donorId);
      if (req?.user?.id) {
        const geoScope = await this.resolveGeoScope(req.user);
        const scope = await this.donorService.resolveDonorScope(req.user);
        this.donorService.assertDonorViewAccess(scope, donor, geoScope);
        await this.checkDonorPermission(req.user.id, donor.source, "view");
      }

      const data = await this.donorService.revealDonorPassword(donorId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Password revealed",
        data,
      });
    } catch (error: any) {
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

  @Post(":id/reset-password")
  @UseGuards(JwtGuard, PermissionsGuard)
  @RequiredPermissions(["super_admin", "fund_raising_manager"])
  async resetPassword(
    @Param("id") id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const donorId = Number(id);
      if (!donorId || Number.isNaN(donorId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid donor id",
          data: null,
        });
      }

      const donor = await this.donorService.findOne(donorId);
      if (req?.user?.id) {
        const geoScope = await this.resolveGeoScope(req.user);
        const scope = await this.donorService.resolveDonorScope(req.user);
        this.donorService.assertDonorViewAccess(scope, donor, geoScope);
        await this.checkDonorPermission(req.user.id, donor.source, "update");
      }

      const data = await this.donorService.resetPasswordAdmin(donorId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Password reset successfully",
        data,
      });
    } catch (error: any) {
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
}
