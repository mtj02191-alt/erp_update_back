import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "src/auth/current-user.decorator";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { User } from "src/users/user.entity";
import { CreateSubprogramDto } from "./dto/create-subprogram.dto";
import { UpdateSubprogramDto } from "./dto/update-subprogram.dto";
import { SubprogramsService } from "./subprograms.service";
import { UseGuards } from "@nestjs/common";

@Controller("program/subprograms")
@UseGuards(JwtGuard, PermissionsGuard)
export class SubprogramsController {
  constructor(private readonly subprogramsService: SubprogramsService) {}

  @Post()
  create(
    @Body() createSubprogramDto: CreateSubprogramDto,
    @CurrentUser() user: User,
  ) {
    return this.subprogramsService.create(createSubprogramDto, user);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("active") active?: string,
    @Query("program_id") programId?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    const activeBool =
      typeof active === "string"
        ? active.toLowerCase() === "true" || active === "1"
        : undefined;
    const programIdNum = programId ? parseInt(programId, 10) : undefined;

    return this.subprogramsService.findAll({
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
      active: typeof active === "string" ? activeBool : undefined,
      program_id: programIdNum,
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.subprogramsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateSubprogramDto: UpdateSubprogramDto,
    @CurrentUser() user: User,
  ) {
    return this.subprogramsService.update(+id, updateSubprogramDto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.subprogramsService.remove(+id);
  }
}
