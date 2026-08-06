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
import { ProjectCommandSheetsService } from "./project-command-sheets.service";
import { CreateProjectCommandSheetDto } from "./dto/create-project-command-sheet.dto";
import { UpdateProjectCommandSheetDto } from "./dto/update-project-command-sheet.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../users/user.entity";

@Controller("project-command-sheets")
@UseGuards(JwtGuard, RolesGuard)
export class ProjectCommandSheetsController {
  constructor(
    private readonly projectCommandSheetsService: ProjectCommandSheetsService,
  ) {}

  @Post()
  create(
    @Body() createProjectCommandSheetDto: CreateProjectCommandSheetDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.projectCommandSheetsService.create(
      createProjectCommandSheetDto,
      currentUser,
    );
  }

  @Get()
  findAll(@Query() payload: any) {
    return this.projectCommandSheetsService.findAll(payload);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.projectCommandSheetsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateProjectCommandSheetDto: UpdateProjectCommandSheetDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.projectCommandSheetsService.update(
      id,
      updateProjectCommandSheetDto,
      currentUser,
    );
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO, UserRole.PA)
  remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.projectCommandSheetsService.remove(id, currentUser);
  }

  @Post(":sheetId/action-items/:actionItemId/convert-to-task")
  convertActionItemToTask(
    @Param("sheetId", ParseIntPipe) sheetId: number,
    @Param("actionItemId") actionItemId: string,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.projectCommandSheetsService.convertActionItemToTask(
      sheetId,
      actionItemId,
      convertToTaskDto,
      currentUser,
    );
  }

  @Post(":sheetId/convert-to-task")
  convertSheetToTask(
    @Param("sheetId", ParseIntPipe) sheetId: number,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.projectCommandSheetsService.convertSheetToTask(
      sheetId,
      convertToTaskDto,
      currentUser,
    );
  }
}
