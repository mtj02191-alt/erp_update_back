import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AasCollectionCentersReportService } from "./aas_collection_centers_report.service";
import { CreateAasCollectionCentersReportDto } from "./dto/create-aas_collection_centers_report.dto";
import { UpdateAasCollectionCentersReportDto } from "./dto/update-aas_collection_centers_report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";

@Controller("program/aas-collection-centers-reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class AasCollectionCentersReportController {
  constructor(
    private readonly aasCollectionCentersReportService: AasCollectionCentersReportService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateAasCollectionCentersReportDto,
    @CurrentUser() user: User,
  ) {
    return this.aasCollectionCentersReportService.create(dto, user);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.aasCollectionCentersReportService.findAll({
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.aasCollectionCentersReportService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAasCollectionCentersReportDto,
    @CurrentUser() user: User,
  ) {
    return this.aasCollectionCentersReportService.update(+id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.aasCollectionCentersReportService.remove(+id);
  }
}
