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
import { AlHasanainClgService } from "./al_hasanain_clg.service";
import { CreateAlHasanainClgDto } from "./dto/create-al_hasanain_clg.dto";
import { UpdateAlHasanainClgDto } from "./dto/update-al_hasanain_clg.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";

@Controller("program/al-hasanain-clg")
@UseGuards(JwtGuard, PermissionsGuard)
export class AlHasanainClgController {
  constructor(private readonly alHasanainClgService: AlHasanainClgService) {}

  @Post()
  create(@Body() dto: CreateAlHasanainClgDto, @CurrentUser() user: User) {
    return this.alHasanainClgService.create(dto, user);
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
    return this.alHasanainClgService.findAll({
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.alHasanainClgService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAlHasanainClgDto,
    @CurrentUser() user: User,
  ) {
    return this.alHasanainClgService.update(+id, dto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.alHasanainClgService.remove(+id);
  }
}
