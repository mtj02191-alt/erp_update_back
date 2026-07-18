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
import { RoutesService } from "./routes.service";
import { CreateRouteDto } from "./dto/create-route.dto";
import { UpdateRouteDto } from "./dto/update-route.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("routes")
@UseGuards(JwtGuard, PermissionsGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @RequiredPermissions([
    "geographic.routes.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(@Body() createRouteDto: CreateRouteDto, @Res() res: Response) {
    try {
      const result = await this.routesService.create(createRouteDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Route created successfully",
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
  // @RequiredPermissions(['geographic.routes.list_view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findAll(
    @Query("city_id") cityId?: string,
    @Query("region_id") regionId?: string,
    @Query("country_id") countryId?: string,
    @Res() res?: Response,
  ) {
    try {
      let result;
      if (cityId) {
        result = await this.routesService.findByCity(+cityId);
      } else if (regionId) {
        result = await this.routesService.findByRegion(+regionId);
      } else if (countryId) {
        result = await this.routesService.findByCountry(+countryId);
      } else {
        result = await this.routesService.findAll();
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Routes retrieved successfully",
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
  // @RequiredPermissions(['geographic.routes.view', 'super_admin', 'geographic_manager', 'geographic_user'])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.routesService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Route retrieved successfully",
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
    "geographic.routes.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.routesService.update(+id, updateRouteDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Route updated successfully",
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
    "geographic.routes.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.routesService.remove(+id);
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
