import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "../../../auth/jwt.guard";
import { PermissionsGuard } from "../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../permissions/decorators/require-permission.decorator";
import { GeographicAssignmentService } from "./geographic-assignment.service";
import { ResolveGeographicAssignmentsDto } from "./dto/resolve-geographic-assignments.dto";

const GEO_ASSIGNMENT_READ = [
  "super_admin",
  "geographic_manager",
  "geographic_user",
  "users.create",
  "users.update",
  "users.view",
  "users.list_view",
  "read_only_user_manager",
  "read_only_super_admin",
  "geographic.countries.list_view",
  "geographic.regions.list_view",
  "geographic.districts.list_view",
  "geographic.tehsils.list_view",
  "geographic.cities.list_view",
  "geographic.routes.list_view",
];

@Controller("geographic-assignments")
@UseGuards(JwtGuard, PermissionsGuard)
export class GeographicAssignmentController {
  constructor(
    private readonly geographicAssignmentService: GeographicAssignmentService,
  ) {}

  @Get("search")
  @RequiredPermissions(GEO_ASSIGNMENT_READ)
  async search(
    @Query("q") q: string,
    @Query("limit") limit: string,
    @Res() res: Response,
  ) {
    try {
      const parsedLimit = Math.min(Math.max(Number(limit) || 30, 5), 50);
      const data = await this.geographicAssignmentService.search(q, parsedLimit);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Geographic search results",
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Post("resolve")
  @RequiredPermissions(GEO_ASSIGNMENT_READ)
  async resolve(
    @Body() body: ResolveGeographicAssignmentsDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.geographicAssignmentService.resolve(body);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Geographic assignments resolved",
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }
}
