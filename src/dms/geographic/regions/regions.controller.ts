import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  Res,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import { RegionsService } from "./regions.service";
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("regions")
@UseGuards(JwtGuard, PermissionsGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Post()
  @RequiredPermissions([
    "geographic.regions.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(@Body() createRegionDto: CreateRegionDto, @Res() res: Response) {
    try {
      const result = await this.regionsService.create(createRegionDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Region created successfully",
        data: result,
      });
    } catch (error) {
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
  // @RequiredPermissions(['geographic.regions.list_view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findAll(
    @Query("country_id") countryId?: string,
    @Res() res?: Response,
  ) {
    try {
      let result;
      if (countryId) {
        result = await this.regionsService.findByCountry(+countryId);
      } else {
        result = await this.regionsService.findAll();
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Regions retrieved successfully",
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

  @Get(":id")
  @RequiredPermissions([
    "geographic.regions.view",
    "super_admin",
    "geographic_manager",
    "geographic_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.regionsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Region retrieved successfully",
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

  @Patch(":id")
  @RequiredPermissions([
    "geographic.regions.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateRegionDto: UpdateRegionDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.regionsService.update(+id, updateRegionDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Region updated successfully",
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

  @Delete(":id")
  @RequiredPermissions([
    "geographic.regions.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.regionsService.remove(+id);
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
