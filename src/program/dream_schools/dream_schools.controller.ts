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
import { DreamSchoolsService } from "./dream_schools.service";
import { CreateDreamSchoolDto } from "./dto/create-dream_school.dto";
import { UpdateDreamSchoolDto } from "./dto/update-dream_school.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";

@Controller("program/dream-schools")
@UseGuards(JwtGuard, PermissionsGuard)
export class DreamSchoolsController {
  constructor(private readonly dreamSchoolsService: DreamSchoolsService) {}

  @Post()
  create(@Body() dto: CreateDreamSchoolDto, @CurrentUser() user: User) {
    return this.dreamSchoolsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.dreamSchoolsService.findAll({
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.dreamSchoolsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDreamSchoolDto,
    @CurrentUser() user: User,
  ) {
    return this.dreamSchoolsService.update(+id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.dreamSchoolsService.remove(+id);
  }
}
