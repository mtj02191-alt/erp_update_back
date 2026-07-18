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
import { DistrictsService } from "./districts.service";
import { CreateDistrictDto } from "./dto/create-district.dto";
import { UpdateDistrictDto } from "./dto/update-district.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("districts")
@UseGuards(JwtGuard, PermissionsGuard)
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Post()
  @RequiredPermissions([
    "geographic.districts.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(
    @Body() createDistrictDto: CreateDistrictDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.districtsService.create(createDistrictDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "District created successfully",
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
  // @RequiredPermissions(['geographic.districts.list_view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findAll(
    @Query("region_id") regionId?: string,
    @Query("country_id") countryId?: string,
    @Res() res?: Response,
  ) {
    try {
      let result;
      if (regionId) {
        result = await this.districtsService.findByRegion(+regionId);
      } else if (countryId) {
        result = await this.districtsService.findByCountry(+countryId);
      } else {
        result = await this.districtsService.findAll();
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Districts retrieved successfully",
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
    "geographic.districts.view",
    "super_admin",
    "geographic_manager",
    "geographic_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.districtsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "District retrieved successfully",
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
    "geographic.districts.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDistrictDto: UpdateDistrictDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.districtsService.update(+id, updateDistrictDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "District updated successfully",
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
    "geographic.districts.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.districtsService.remove(+id);
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
