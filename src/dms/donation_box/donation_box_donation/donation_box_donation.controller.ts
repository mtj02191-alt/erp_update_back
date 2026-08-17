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
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { DonationBoxDonationService } from "./donation_box_donation.service";
import { CreateDonationBoxDonationDto } from "./dto/create-donation_box_donation.dto";
import { UpdateDonationBoxDonationDto } from "./dto/update-donation_box_donation.dto";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { GeographicScopeService } from "../../../permissions/geographic-scope/geographic-scope.service";

@Controller("donation-box-donation")
@UseGuards(JwtGuard, PermissionsGuard)
export class DonationBoxDonationController {
  constructor(
    private readonly donationBoxDonationService: DonationBoxDonationService,
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  private async checkGeographicAccessByBoxId(
    userId: number,
    donationBoxId: number,
    userRole?: string,
    userSnapshot?: Record<string, unknown> | null,
  ): Promise<void> {
    const box =
      await this.donationBoxDonationService.getDonationBoxById(donationBoxId);
    if (!box) return;

    await this.geographicScopeService.assertRecordAccess(
      userId,
      "donation_boxes",
      box,
      userRole,
      userSnapshot as any,
    );
  }

  @Post()
  @RequiredPermissions([
    "fund_raising.donation_box_donations.create",
    "super_admin",
    "fund_raising_manager",
  ])
  async create(
    @Body() createDonationBoxDonationDto: CreateDonationBoxDonationDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = req.user?.id;

      // Geographic access check on the parent donation box
      if (createDonationBoxDonationDto.donation_box_id) {
        await this.checkGeographicAccessByBoxId(
          currentUserId,
          createDonationBoxDonationDto.donation_box_id,
          req.user?.role,
          req.user,
        );
      }

      const result = await this.donationBoxDonationService.create(
        createDonationBoxDonationDto,
        currentUserId,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Collection recorded successfully",
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
  async getDonationBoxDonationOptions(
    @Query("donation_box_id") donationBoxId?: string,
    @Query("status") status?: string,
  ) {
    return this.donationBoxDonationService.getDonationBoxDonationListForDropdown(
      {
        donationBoxId: donationBoxId ? parseInt(donationBoxId) : undefined,
        status: status || undefined,
      },
    );
  }

  @Get()
  @RequiredPermissions([
    "fund_raising.donation_box_donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
    @Query("donation_box_id") donation_box_id?: string,
    @Query("status") status?: string,
    @Query("payment_method") payment_method?: string,
    @Query("min_amount") min_amount?: string,
    @Query("max_amount") max_amount?: string,
    @Query("date") date?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Res() res?: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;

      const result = await this.donationBoxDonationService.findAll(
        {
          page: pageNum,
          pageSize: pageSizeNum,
          sortField,
          sortOrder,
          search,
          donation_box_id: donation_box_id
            ? parseInt(donation_box_id)
            : undefined,
          status,
          payment_method,
          min_amount,
          max_amount,
          date,
          start_date,
          end_date,
        },
        geoScope,
        currentUser,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection records retrieved successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get("box/:boxId")
  @RequiredPermissions([
    "fund_raising.donation_box_donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findByDonationBox(
    @Param("boxId") boxId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("payment_method") payment_method?: string,
    @Query("min_amount") min_amount?: string,
    @Query("max_amount") max_amount?: string,
    @Query("date") date?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Res() res?: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      // Geographic access check on the parent donation box
      await this.checkGeographicAccessByBoxId(
        currentUser?.id,
        +boxId,
        currentUser?.role,
        currentUser,
      );

      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;

      const result = await this.donationBoxDonationService.findAll(
        {
          page: pageNum,
          pageSize: pageSizeNum,
          sortField,
          sortOrder,
          search,
          donation_box_id: +boxId,
          status,
          payment_method,
          min_amount,
          max_amount,
          date,
          start_date,
          end_date,
        },
        geoScope,
        currentUser,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collections retrieved successfully",
        ...result,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: error.message,
          data: [],
        });
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get("box/:boxId/stats")
  @RequiredPermissions([
    "fund_raising.donation_box_donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getBoxCollectionStats(
    @Param("boxId") boxId: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      // Geographic access check on the parent donation box
      await this.checkGeographicAccessByBoxId(
        currentUser?.id,
        +boxId,
        currentUser?.role,
        currentUser,
      );

      const result =
        await this.donationBoxDonationService.getBoxCollectionStats(+boxId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection statistics retrieved successfully",
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
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id/audit-history")
  @RequiredPermissions([
    "fund_raising.donation_box_donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async getAuditHistory(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const existing = await this.donationBoxDonationService.findOne(+id);
      const scope =
        await this.donationBoxDonationService.resolveCollectionScope(
          currentUser,
        );
      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;
      this.donationBoxDonationService.assertCollectionViewAccess(
        scope,
        existing,
        geoScope,
      );

      const history =
        await this.donationBoxDonationService.getDonationBoxDonationAuditHistory(
          +id,
        );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection audit history retrieved successfully",
        data: history,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: error.message,
          data: null,
        });
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
  @RequiredPermissions([
    "fund_raising.donation_box_donations.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findOne(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const result = await this.donationBoxDonationService.findOne(+id);
      const scope =
        await this.donationBoxDonationService.resolveCollectionScope(
          currentUser,
        );
      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;
      this.donationBoxDonationService.assertCollectionViewAccess(
        scope,
        result,
        geoScope,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection record retrieved successfully",
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

  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.donation_box_donations.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDonationBoxDonationDto: UpdateDonationBoxDonationDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      const currentUser = req.user;
      const currentUserId = currentUser?.id;

      // Geographic access check on the existing record's parent donation box
      const existing = await this.donationBoxDonationService.findOne(+id);
      const scope =
        await this.donationBoxDonationService.resolveCollectionScope(
          currentUser,
        );
      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;
      this.donationBoxDonationService.assertCollectionViewAccess(
        scope,
        existing,
        geoScope,
      );

      const result = await this.donationBoxDonationService.update(
        +id,
        updateDonationBoxDonationDto,
        currentUserId,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection record updated successfully",
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

  @Delete(":id")
  @RequiredPermissions([
    "fund_raising.donation_box_donations.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      // Geographic access check on the existing record's parent donation box
      const existing = await this.donationBoxDonationService.findOne(+id);
      const scope =
        await this.donationBoxDonationService.resolveCollectionScope(
          currentUser,
        );
      const geoScope = currentUser?.id
        ? await this.geographicScopeService.resolveForUser(
            currentUser.id,
            currentUser.role,
            currentUser,
          )
        : null;
      this.donationBoxDonationService.assertCollectionViewAccess(
        scope,
        existing,
        geoScope,
      );

      const result = await this.donationBoxDonationService.remove(
        +id,
        currentUser?.id,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: null,
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
}
