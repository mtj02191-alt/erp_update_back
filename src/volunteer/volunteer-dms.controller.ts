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
} from "@nestjs/common";
import { Response } from "express";
import { VolunteerService } from "./volunteer.service";
import { CreateVolunteerDto } from "./dto/create-volunteer.dto";
import { UpdateVolunteerDto } from "./dto/update-volunteer.dto";
import { ConditionalJwtGuard } from "../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions/decorators/require-permission.decorator";

@Controller("volunteers")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class VolunteerDmsController {
  constructor(private readonly volunteerService: VolunteerService) {}

  /**
   * DMS: Register a new volunteer
   * POST /volunteers/register
   */
  @Post("register")
  @RequiredPermissions([
    "fund_raising.volunteers.create",
    "super_admin",
    "fund_raising_manager",
  ])
  async register(
    @Body() createVolunteerDto: CreateVolunteerDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.volunteerService.create(createVolunteerDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Volunteer registered successfully",
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

  /**
   * DMS: Get all volunteers (paginated)
   * GET /volunteers
   */
  @Get()
  @RequiredPermissions([
    "fund_raising.volunteers.list_view",
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
    @Query("category") category?: string,
    @Query("availability") availability?: string,
    @Query("source") source?: string,
    @Query("status") status?: string,
    @Query("gender") gender?: string,
    @Query("city") city?: string,
    @Query("verification_status") verification_status?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      const result = await this.volunteerService.findAllPaginated({
        page: pageNum,
        pageSize: pageSizeNum,
        sortField,
        sortOrder,
        search,
        category,
        availability,
        source,
        status,
        gender,
        city,
        verification_status,
        start_date,
        end_date,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Volunteers retrieved successfully",
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

  /**
   * DMS: Get single volunteer
   * GET /volunteers/:id
   */
  @Get(":id")
  @RequiredPermissions([
    "fund_raising.volunteers.view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.volunteerService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Volunteer retrieved successfully",
        data: result,
      });
    } catch (error) {
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
   * DMS: Update volunteer
   * PATCH /volunteers/:id
   */
  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.volunteers.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateVolunteerDto: UpdateVolunteerDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.volunteerService.update(
        +id,
        updateVolunteerDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Volunteer updated successfully",
        data: result,
      });
    } catch (error) {
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
   * DMS: Delete volunteer (soft delete)
   * DELETE /volunteers/:id
   */
  @Delete(":id")
  @RequiredPermissions([
    "fund_raising.volunteers.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.volunteerService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
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
