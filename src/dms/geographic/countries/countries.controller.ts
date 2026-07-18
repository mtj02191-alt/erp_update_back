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
} from "@nestjs/common";
import { Response } from "express";
import { CountriesService } from "./countries.service";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";

@Controller("countries")
@UseGuards(JwtGuard, PermissionsGuard)
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  @RequiredPermissions([
    "geographic.countries.create",
    "super_admin",
    "geographic_manager",
  ])
  async create(
    @Body() createCountryDto: CreateCountryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.countriesService.create(createCountryDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Country created successfully",
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
  @RequiredPermissions([
    "geographic.countries.list_view",
    "super_admin",
    "geographic_manager",
    "geographic_user",
  ])
  async findAll(@Res() res: Response) {
    try {
      const result = await this.countriesService.findAll();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Countries retrieved successfully",
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
    "geographic.countries.view",
    "super_admin",
    "geographic_manager",
    "geographic_user",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.countriesService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Country retrieved successfully",
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
    "geographic.countries.update",
    "super_admin",
    "geographic_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateCountryDto: UpdateCountryDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.countriesService.update(+id, updateCountryDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Country updated successfully",
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
    "geographic.countries.delete",
    "super_admin",
    "geographic_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.countriesService.remove(+id);
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
