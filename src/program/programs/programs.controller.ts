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
import { ProgramsService } from "./programs.service";
import { CreateProgramDto } from "./dto/create-program.dto";
import { UpdateProgramDto } from "./dto/update-program.dto";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { UseGuards } from "@nestjs/common";

@Controller("program/programs")
@UseGuards(JwtGuard, PermissionsGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  create(
    @Body() createProgramDto: CreateProgramDto,
    @CurrentUser() user: User,
  ) {
    return this.programsService.create(createProgramDto, user);
  }

  @Get()
  findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("active") active?: string,
    @Query("applicationable") applicationable?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    const activeBool =
      typeof active === "string"
        ? active.toLowerCase() === "true" || active === "1"
        : undefined;

    let applicationableFilter: boolean | undefined;
    if (typeof applicationable === "string") {
      const v = applicationable.trim().toLowerCase();
      if (v === "true" || v === "1") applicationableFilter = true;
      else if (v === "false" || v === "0") applicationableFilter = false;
    }

    return this.programsService.findAll({
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
      active: typeof active === "string" ? activeBool : undefined,
      applicationable: applicationableFilter,
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.programsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateProgramDto: UpdateProgramDto,
    @CurrentUser() user: User,
  ) {
    return this.programsService.update(+id, updateProgramDto, user);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.programsService.remove(+id);
  }
}
