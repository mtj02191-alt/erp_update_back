import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { VisitorsService } from "./visitors.service";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../users/user.entity";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";

@Controller("visitors")
@UseGuards(JwtGuard, RolesGuard)
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  create(@Body() createDto: any, @CurrentUser() currentUser: User) {
    return this.visitorsService.create(createDto, currentUser);
  }

  @Get()
  findAll(@Query() payload: any) {
    return this.visitorsService.findAll(payload);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Query("type") type: string | undefined) {
    return this.visitorsService.findOne(id, type);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() currentUser: User,
  ) {
    return this.visitorsService.update(id, updateDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO, UserRole.PA)
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
    @Query("type") type: string | undefined,
  ) {
    return this.visitorsService.remove(id, currentUser, type);
  }

  @Post(":id/convert-to-task")
  convertToTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.visitorsService.convertToTask(id, convertToTaskDto, currentUser);
  }
}
