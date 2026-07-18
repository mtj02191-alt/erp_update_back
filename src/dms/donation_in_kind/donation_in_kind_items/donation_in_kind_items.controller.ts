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
} from "@nestjs/common";
import { Response } from "express";
import { DonationInKindItemsService } from "./donation_in_kind_items.service";
import { CreateDonationInKindItemDto } from "./dto/create-donation_in_kind_item.dto";
import { UpdateDonationInKindItemDto } from "./dto/update-donation_in_kind_item.dto";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";
import { JwtGuard } from "src/auth/jwt.guard";

@Controller("dms/in-kind-items")
@UseGuards(JwtGuard, PermissionsGuard)
export class DonationInKindItemsController {
  constructor(
    private readonly donationInKindItemsService: DonationInKindItemsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.create",
    "super_admin",
    "fund_raising_manager",
  ])
  async create(
    @Body() createDonationInKindItemDto: CreateDonationInKindItemDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.donationInKindItemsService.create(
        createDonationInKindItemDto,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Donation in kind item created successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("list")
  // @RequiredPermissions([
  //   'fund_raising.donation_in_kind_items.list_view',
  //   'super_admin',
  //   'fund_raising_manager',
  // ])
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("condition") condition?: string,
    @Query("status") status?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.donationInKindItemsService.findAll({
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 10,
        sortField,
        sortOrder,
        search,
        category,
        condition,
        status,
        start_date,
        end_date,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation in kind items retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("statistics")
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async getStatistics(@Res() res: Response) {
    try {
      const result = await this.donationInKindItemsService.getStatistics();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Statistics retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("category/:category")
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async findByCategory(
    @Param("category") category: string,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.donationInKindItemsService.findByCategory(category);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Items retrieved by category successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.donationInKindItemsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation in kind item retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDonationInKindItemDto: UpdateDonationInKindItemDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.donationInKindItemsService.update(
        +id,
        updateDonationInKindItemDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation in kind item updated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "fund_raising.donation_in_kind_items.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.donationInKindItemsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation in kind item deleted successfully",
        data: null,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
