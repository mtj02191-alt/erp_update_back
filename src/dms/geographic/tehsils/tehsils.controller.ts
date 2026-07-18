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
import { TehsilsService } from "./tehsils.service";
import { CreateTehsilDto } from "./dto/create-tehsil.dto";
import { UpdateTehsilDto } from "./dto/update-tehsil.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("tehsils")
@UseGuards(JwtGuard, PermissionsGuard)
export class TehsilsController {
  constructor(private readonly tehsilsService: TehsilsService) {}

  @Post()
  @RequiredPermissions([
    "geographic.tehsils.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(@Body() createTehsilDto: CreateTehsilDto, @Res() res: Response) {
    try {
      const result = await this.tehsilsService.create(createTehsilDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Tehsil created successfully",
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
  // @RequiredPermissions(['geographic.tehsils.list_view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findAll(
    @Query("district_id") districtId?: string,
    @Query("region_id") regionId?: string,
    @Query("country_id") countryId?: string,
    @Res() res?: Response,
  ) {
    try {
      let result;
      if (districtId) {
        result = await this.tehsilsService.findByDistrict(+districtId);
      } else if (regionId) {
        result = await this.tehsilsService.findByRegion(+regionId);
      } else if (countryId) {
        result = await this.tehsilsService.findByCountry(+countryId);
      } else {
        result = await this.tehsilsService.findAll();
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tehsils retrieved successfully",
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
    "geographic.tehsils.view",
    "super_admin",
    "geographic_manager",
    "geographic_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.tehsilsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tehsil retrieved successfully",
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
    "geographic.tehsils.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateTehsilDto: UpdateTehsilDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.tehsilsService.update(+id, updateTehsilDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tehsil updated successfully",
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
    "geographic.tehsils.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.tehsilsService.remove(+id);
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
