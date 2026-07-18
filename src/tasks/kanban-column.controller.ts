import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { KanbanColumnService } from "./kanban-column.service";
import { CreateKanbanColumnDto } from "./dto/create-kanban-column.dto";
import { UpdateKanbanColumnDto } from "./dto/update-kanban-column.dto";
import { ReorderKanbanColumnsDto } from "./dto/reorder-kanban-columns.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions";
import { CurrentUser } from "../auth/current-user.decorator";
import { User, UserRole } from "../users/user.entity";

@Controller("tasks/kanban-columns")
@UseGuards(JwtGuard, PermissionsGuard)
export class KanbanColumnController {
  constructor(private readonly columnService: KanbanColumnService) {}

  @Get()
  @RequiredPermissions([
    "tasking.tasks.list_view",
    "tasks.list_view",
    "tasking.tasks.view",
    "tasks.view",
    "super_admin",
  ])
  async findAll(@Res() res: Response) {
    const data = await this.columnService.findAll();
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Get(":id")
  @RequiredPermissions(["tasking.tasks.view", "tasks.view", "super_admin"])
  async findOne(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const data = await this.columnService.findOne(id);
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Post()
  @RequiredPermissions([UserRole.SUPER_ADMIN, UserRole.ADMIN])
  async create(
    @Body() dto: CreateKanbanColumnDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const data = await this.columnService.create(dto, user);
    return res.status(HttpStatus.CREATED).json({ success: true, data });
  }

  @Put(":id")
  @RequiredPermissions([UserRole.SUPER_ADMIN, UserRole.ADMIN])
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateKanbanColumnDto,
    @Res() res: Response,
  ) {
    const data = await this.columnService.update(id, dto);
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Put("reorder")
  @RequiredPermissions([UserRole.SUPER_ADMIN, UserRole.ADMIN])
  async reorder(@Body() dto: ReorderKanbanColumnsDto, @Res() res: Response) {
    await this.columnService.reorder(dto);
    return res.status(HttpStatus.OK).json({ success: true });
  }

  @Delete(":id")
  @RequiredPermissions([UserRole.SUPER_ADMIN, UserRole.ADMIN])
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Query("force") force: string = "false",
    @Res() res: Response,
  ) {
    await this.columnService.remove(id, force === "true");
    return res.status(HttpStatus.OK).json({ success: true });
  }
}
