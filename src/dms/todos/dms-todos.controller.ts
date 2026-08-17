import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { DmsTodosService } from "./dms-todos.service";
import { CreateDmsTodoDto } from "./dto/create-dms-todo.dto";
import { UpdateDmsTodoDto } from "./dto/update-dms-todo.dto";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { JwtGuard } from "src/auth/jwt.guard";

@Controller("dms/todos")
@UseGuards(JwtGuard, PermissionsGuard)
export class DmsTodosController {
  constructor(private readonly todosService: DmsTodosService) {}

  @Post()
  @RequiredPermissions([
    "fund_raising.dms_todos.create",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async create(
    @Body() dto: CreateDmsTodoDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.todosService.create(dto, req.user?.id);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Todo created successfully",
        data,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("summary")
  @RequiredPermissions([
    "fund_raising.dms_todos.list_view",
    "fund_raising.dms_todos.view",
    "fund_raising.dms_todos.create",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async summary(@Request() req: any, @Res() res: Response) {
    try {
      const data = await this.todosService.getSummary(req.user?.id, true);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Summary fetched successfully",
        data,
      });
    } catch (error) {
      const err: any = error;
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: err?.message || "Todos listing failed",
        data: null,
        debug: {
          name: err?.name,
          code: err?.code,
          detail: err?.detail,
          sqlMessage: err?.sqlMessage,
          stack: err?.stack,
        },
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "fund_raising.dms_todos.list_view",
    "fund_raising.dms_todos.view",
    "fund_raising.dms_todos.create",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findAll(
    @Request() req: any,
    @Res() res: Response,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("related_type") related_type?: string,
    @Query("related_id") related_id?: string,
    @Query("assigned_to_id") assigned_to_id?: string,
    @Query("due_date") due_date?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Query("is_recurring") is_recurring?: string,
    @Query("mine_only") mine_only?: string,
  ) {
    try {
      const mineOnly =
        mine_only === undefined ||
        mine_only === "" ||
        mine_only === "true" ||
        mine_only === "1";

      let isRecurring: boolean | undefined;
      if (is_recurring === "true" || is_recurring === "1") isRecurring = true;
      if (is_recurring === "false" || is_recurring === "0") isRecurring = false;

      const result = await this.todosService.findAll(
        {
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 10,
          sortField,
          sortOrder,
          search,
          status,
          priority,
          related_type,
          related_id: related_id ? parseInt(related_id, 10) : undefined,
          assigned_to_id: assigned_to_id
            ? parseInt(assigned_to_id, 10)
            : undefined,
          due_date,
          start_date,
          end_date,
          is_recurring: isRecurring,
          mine_only: mineOnly,
        },
        req.user?.id,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Todos fetched successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "fund_raising.dms_todos.view",
    "fund_raising.dms_todos.list_view",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async findOne(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.todosService.findOne(parseInt(id, 10));
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Todo fetched successfully",
        data,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id/complete")
  @RequiredPermissions([
    "fund_raising.dms_todos.update",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async markComplete(
    @Param("id") id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.todosService.markComplete(
        parseInt(id, 10),
        req.user?.id,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: data.next_occurrence
          ? "Todo marked as done; next occurrence created"
          : "Todo marked as done",
        data,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.dms_todos.update",
    "super_admin",
    "fund_raising_manager",
    "fund_raising_user",
  ])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateDmsTodoDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.todosService.update(
        parseInt(id, 10),
        dto,
        req.user?.id,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Todo updated successfully",
        data,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "fund_raising.dms_todos.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(
    @Param("id") id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    try {
      await this.todosService.remove(parseInt(id, 10), req.user?.id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Todo deleted successfully",
        data: null,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
