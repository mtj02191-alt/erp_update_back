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
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { DonationBoxService } from "./donation-box.service";
import { CreateDonationBoxDto } from "./dto/create-donation-box.dto";
import { UpdateDonationBoxDto } from "./dto/update-donation-box.dto";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";

@Controller("donation-box")
@UseGuards(JwtGuard, PermissionsGuard)
export class DonationBoxController {
  constructor(private readonly donationBoxService: DonationBoxService) {}

  /**
   * Check if user has geographic access to a donation box by its city_id.
   * Throws ForbiddenException if user doesn't have access.
   */
  private async checkGeographicAccess(
    userId: number,
    cityId: number,
  ): Promise<void> {
    const assignedCityIds =
      await this.donationBoxService.resolveUserGeographyCityIds(userId);
    // null means no geo restriction (super_admin, non-fund_raising, or no assignments)
    if (assignedCityIds === null) return;
    if (!assignedCityIds.includes(cityId)) {
      throw new ForbiddenException(
        "You do not have geographic access to this donation box",
      );
    }
  }

  @Post()
  @RequiredPermissions([
    "fund_raising.donation_box.create",
    "super_admin",
    "fund_raising_manager",
  ])
  async create(
    @Body() createDonationBoxDto: CreateDonationBoxDto,
    @Res() res: Response,
    @CurrentUser() currentUser: any,
  ) {
    try {
      // Geographic access check on the city being assigned
      if (createDonationBoxDto.city_id) {
        await this.checkGeographicAccess(
          currentUser.id,
          createDonationBoxDto.city_id,
        );
      }

      const result = await this.donationBoxService.create(
        createDonationBoxDto,
        currentUser,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Donation box created successfully",
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

  @Get("options")
  @UseGuards(JwtGuard)
  async getDonationBoxOptions(
    @Query("active") activeOnly?: string,
    @Query("status") status?: string,
  ) {
    return this.donationBoxService.getDonationBoxListForDropdown({
      activeOnly: activeOnly === "true",
      status: status || undefined,
    });
  }

  @Get()
  @RequiredPermissions([
    "fund_raising.donation_box.list_view",
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
    @Query("region") region?: string,
    @Query("city") city?: string,
    @Query("box_type") box_type?: string,
    @Query("status") status?: string,
    @Query("is_active") is_active?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Res() res?: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      // Resolve geographic restriction
      const assignedCityIds =
        await this.donationBoxService.resolveUserGeographyCityIds(
          currentUser?.id,
        );

      const result = await this.donationBoxService.findAll(
        {
          page: pageNum,
          pageSize: pageSizeNum,
          sortField,
          sortOrder,
          search,
          region,
          city,
          box_type,
          status,
          is_active: is_active ? is_active === "true" : undefined,
          start_date,
          end_date,
        },
        assignedCityIds,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation box retrieved successfully",
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

  @Get("active-by-region/:region")
  @RequiredPermissions([
    "fund_raising.donation_box.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findActiveByRegion(
    @Param("region") region: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const result = await this.donationBoxService.findActiveByRegion(region);

      // Filter results by geographic access
      const assignedCityIds =
        await this.donationBoxService.resolveUserGeographyCityIds(
          currentUser?.id,
        );
      const filteredResult = assignedCityIds
        ? result.filter((box) => assignedCityIds.includes(box.city_id))
        : result;

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Active donation box retrieved successfully",
        data: filteredResult,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "fund_raising.donation_box.view",
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
      const result = await this.donationBoxService.findOne(+id);

      // Geographic access check
      if (result.city_id) {
        await this.checkGeographicAccess(currentUser.id, result.city_id);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation box retrieved successfully",
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
    "fund_raising.donation_box.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDonationBoxDto: UpdateDonationBoxDto,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      // Check geographic access on existing box
      const existingBox = await this.donationBoxService.findOne(+id);
      if (existingBox.city_id) {
        await this.checkGeographicAccess(currentUser.id, existingBox.city_id);
      }

      const result = await this.donationBoxService.update(
        +id,
        updateDonationBoxDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation box updated successfully",
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
    "fund_raising.donation_box.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      // Check geographic access
      const existingBox = await this.donationBoxService.findOne(+id);
      if (existingBox.city_id) {
        await this.checkGeographicAccess(currentUser.id, existingBox.city_id);
      }

      const result = await this.donationBoxService.remove(+id);
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

  @Post(":id/collection")
  @RequiredPermissions([
    "fund_raising.donation_box.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async updateCollection(
    @Param("id") id: string,
    @Body() collectionData: { amount: number },
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      // Check geographic access
      const existingBox = await this.donationBoxService.findOne(+id);
      if (existingBox.city_id) {
        await this.checkGeographicAccess(currentUser.id, existingBox.city_id);
      }

      const result = await this.donationBoxService.updateCollectionStats(
        +id,
        collectionData.amount,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Collection statistics updated successfully",
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

  // i want to get by key number
  @Get("by-key-number/:key_number")
  @RequiredPermissions([
    "fund_raising.donation_box.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findByKeyNumber(
    @Param("key_number") key_number: string,
    @Res() res: Response,
    @CurrentUser() currentUser?: any,
  ) {
    try {
      const result = await this.donationBoxService.findByKeyNumber(key_number);

      // Geographic access check
      if (result && result.city_id) {
        await this.checkGeographicAccess(currentUser.id, result.city_id);
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation box retrieved successfully",
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
      console.error("Error retrieving donation box by key number:", error);
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
