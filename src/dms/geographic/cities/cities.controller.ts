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
import { CitiesService } from "./cities.service";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("cities")
@UseGuards(JwtGuard, PermissionsGuard)
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Post()
  @RequiredPermissions([
    "geographic.cities.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(@Body() createCityDto: CreateCityDto, @Res() res: Response) {
    try {
      const result = await this.citiesService.create(createCityDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "City created successfully",
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
  // @RequiredPermissions(['geographic.cities.list_view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findAll(
    @Query("tehsil_id") tehsilId?: string,
    @Query("district_id") districtId?: string,
    @Query("region_id") regionId?: string,
    @Query("country_id") countryId?: string,
    @Res() res?: Response,
  ) {
    try {
      let result;
      if (tehsilId) {
        result = await this.citiesService.findByTehsil(+tehsilId);
      } else if (districtId) {
        result = await this.citiesService.findByDistrict(+districtId);
      } else if (regionId) {
        result = await this.citiesService.findByRegion(+regionId);
      } else if (countryId) {
        result = await this.citiesService.findByCountry(+countryId);
      } else {
        result = await this.citiesService.findAll();
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Cities retrieved successfully",
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
  // @RequiredPermissions(['geographic.cities.view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.citiesService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "City retrieved successfully",
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
    "geographic.cities.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateCityDto: UpdateCityDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.citiesService.update(+id, updateCityDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "City updated successfully",
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
    "geographic.cities.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.citiesService.remove(+id);
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
