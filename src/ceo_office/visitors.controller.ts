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
} from "@nestjs/common";
import { VisitorsService } from "./visitors.service";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../users/user.entity";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";

@Controller("visitors")
@UseGuards(JwtGuard)
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
  findOne(@Param("id") id: string) {
    return this.visitorsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDto: any,
    @CurrentUser() currentUser: User,
  ) {
    return this.visitorsService.update(+id, updateDto, currentUser);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.visitorsService.remove(+id);
  }

  @Post(":id/convert-to-task")
  convertToTask(
    @Param("id") id: string,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.visitorsService.convertToTask(+id, convertToTaskDto, currentUser);
  }
}
