import {
  Controller,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Get,
  Delete,
  UseGuards,
  HttpStatus,
  Res,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { AssignTaskDto } from "./dto/assign-task.dto";
import { ApproveTaskDto } from "./dto/approve-task.dto";
import { AddAttachmentDto } from "./dto/add-attachment.dto";
import { AddCommentDto } from "./dto/add-comment.dto";
import { TimeEntryDto } from "./dto/time-entry.dto";
import { UpdateTaskProgressDto } from "./dto/update-task-progress.dto";
import { StatusTransitionDto } from "./dto/status-transition.dto";
import { TaskApprovalStateDto } from "./dto/task-approval-response.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions";
import { CurrentUser } from "../auth/current-user.decorator";
import { User, UserRole } from "../users/user.entity";

@Controller("tasks")
@UseGuards(JwtGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequiredPermissions(["tasking.tasks.create", "tasks.create", "super_admin"])
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.create(dto, user);
    return res.status(HttpStatus.CREATED).json({ success: true, data: result });
  }

  @Post("search")
  @RequiredPermissions([
    "tasking.tasks.list_view",
    "tasks.list_view",
    "tasking.tasks.view",
    "tasks.view",
    "super_admin",
  ])
  async findAll(
    @Body() payload: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.findAll(payload, user);
    return res.status(HttpStatus.OK).json({ success: true, ...result });
  }

  @Get("list")
  @RequiredPermissions([
    "tasking.tasks.list_view",
    "tasks.list_view",
    "tasking.tasks.view",
    "tasks.view",
    "super_admin",
  ])
  async getTaskList(
    @Query() query: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    // Convert query parameters to the same format as POST /tasks/search
    const payload = {
      pagination: {
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 10,
        sortField: query.sortField || "created_at",
        sortOrder: (query.sortOrder || "DESC").toUpperCase(),
      },
      filters: {
        search: query.search || "",
        department: query.department || "",
        status: query.status || "",
        priority: query.priority || "",
        user_name: query.user_name || "",
      },
      strictDepartment: query.strictDepartment === "true" || false,
    };
    const result = await this.tasksService.findAll(payload, user);
    return res.status(HttpStatus.OK).json({ success: true, ...result });
  }

  @Get("dashboard/stats")
  @RequiredPermissions([
    "tasking.dashboard.view",
    "tasks.dashboard.view",
    "super_admin",
  ])
  async getDashboardStats(
    @Query() query: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    // Pass user to service for role-based filtering
    const result = await this.tasksService.getDashboardStats(query, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Get("reports")
  @RequiredPermissions(["tasking.tasks.view", "tasks.view", "super_admin"])
  async getReports(
    @Query() query: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    // Pass user to service for role-based filtering
    const result = await this.tasksService.getReports(query, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Get(":id")
  @RequiredPermissions(["tasking.tasks.view", "tasks.view", "super_admin"])
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.findOne(+id, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Get(":id/approval")
  @RequiredPermissions(["tasking.tasks.view", "tasks.view", "super_admin"])
  async getApprovalState(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const approval = await this.tasksService.getApprovalStateForTask(+id, user);
    const data: TaskApprovalStateDto | null = approval
      ? {
          task_id: approval.task_id,
          approval_required_user_ids:
            approval.approval_required_user_ids ?? null,
          approvals_meta: (approval.approvals_meta as any) ?? null,
          approved_by_id: approval.approved_by_id ?? null,
          rejected_by_id: approval.rejected_by_id ?? null,
          approval_status: approval.approval_status ?? null,
          approved_note: (approval as any).approved_note ?? null,
          rejected_note: (approval as any).rejected_note ?? null,
          submission_note: (approval as any).submission_note ?? null,
        }
      : null;
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Patch(":id")
  @RequiredPermissions(["tasking.tasks.update", "tasks.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.update(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/assign")
  @RequiredPermissions([
    "tasking.tasks.assign",
    "tasks.assign",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  async assign(
    @Param("id") id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.assign(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/reassign")
  @RequiredPermissions([
    "tasking.tasks.assign",
    "tasks.assign",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  async reassign(
    @Param("id") id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.reassign(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/approve")
  @RequiredPermissions([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.DEPT_HEAD,
    UserRole.MANAGER,
    UserRole.USER,
    "tasking.tasks.view",
    "tasks.view",
  ])
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveTaskDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.approve(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Get("approvals/my")
  async getMyApprovals(@CurrentUser() user: User, @Res() res: Response) {
    const approvals =
      await this.tasksService.getApprovalsForUserDashboard(user);
    const data: TaskApprovalStateDto[] = approvals.map((approval) => ({
      task_id: approval.task_id,
      task: approval.task ?? null,
      approval_required_user_ids: approval.approval_required_user_ids ?? null,
      approvals_meta: (approval.approvals_meta as any) ?? null,
      approved_by_id: approval.approved_by_id ?? null,
      rejected_by_id: approval.rejected_by_id ?? null,
      approval_status: approval.approval_status ?? null,
      approved_note: (approval as any).approved_note ?? null,
      rejected_note: (approval as any).rejected_note ?? null,
      submission_note: (approval as any).submission_note ?? null,
    }));
    return res.status(HttpStatus.OK).json({ success: true, data });
  }

  @Post(":id/complete")
  @RequiredPermissions([
    "tasking.tasks.complete",
    "tasks.complete",
    "tasking.tasks.update",
    "tasks.update",
  ])
  async complete(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.complete(+id, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/status-transition")
  @RequiredPermissions([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.DEPT_HEAD,
    UserRole.MANAGER,
    UserRole.USER,
    "tasking.tasks.view",
    "tasks.view",
  ])
  async statusTransition(
    @Param("id") id: string,
    @Body() dto: StatusTransitionDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.transitionStatus(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/attachments")
  @RequiredPermissions([
    "tasking.tasks.view",
    "tasks.view",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  async addAttachment(
    @Param("id") id: string,
    @Body() dto: AddAttachmentDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.addAttachment(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/attachments/upload")
  @RequiredPermissions([
    "tasking.tasks.view",
    "tasks.view",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadRoot = path.join(process.cwd(), "uploads", "tasks");
          fs.mkdirSync(uploadRoot, { recursive: true });
          cb(null, uploadRoot);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const base = path.basename(file.originalname, ext);
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, `${base}-${unique}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/jpg",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException("Unsupported file type"), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAttachment(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("description") description: string,
    @Body("is_initial") is_initial: any,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    const relativeUrl = `/files/tasks/${file.filename}`;
    const result = await this.tasksService.addAttachment(
      +id,
      {
        file_name: file.originalname,
        file_url: relativeUrl,
        file_type: file.mimetype,
        description: description || undefined,
        is_initial: String(is_initial) === "true",
      },
      user,
    );
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Delete(":id/attachments/:attachmentId")
  @RequiredPermissions([
    "tasking.tasks.view",
    "tasks.view",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  async removeAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.removeAttachment(
      +id,
      +attachmentId,
      user,
    );
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/comments")
  @RequiredPermissions([
    "tasking.tasks.view",
    "tasks.view",
    "tasking.tasks.update",
    "tasks.update",
    "super_admin",
  ])
  async addComment(
    @Param("id") id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.addComment(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Delete(":id")
  @RequiredPermissions([
    "tasking.tasks.delete",
    "tasks.delete",
    "super_admin",
    "admin",
  ])
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.remove(+id, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Get(":id/work-history")
  @RequiredPermissions([
    "tasking.tasks.view",
    "tasks.view",
    "tasking.tasks.update",
    "tasks.update",
  ])
  async getWorkHistory(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.getWorkHistory(+id, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Post(":id/time-entries")
  @RequiredPermissions([
    "tasking.tasks.update",
    "tasks.update",
    "tasking.tasks.view",
    "tasks.view",
  ])
  async addTimeEntry(
    @Param("id") id: string,
    @Body() dto: TimeEntryDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.addTimeEntry(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Patch(":id/progress")
  @RequiredPermissions(["tasking.tasks.update", "tasks.update"])
  async updateProgress(
    @Param("id") id: string,
    @Body() dto: UpdateTaskProgressDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.updateProgress(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }

  @Put(":id/progress")
  @RequiredPermissions([
    "tasking.tasks.update",
    "tasks.update",
    "tasking.tasks.view",
    "tasks.view",
  ])
  async replaceProgress(
    @Param("id") id: string,
    @Body() dto: UpdateTaskProgressDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const result = await this.tasksService.updateProgress(+id, dto, user);
    return res.status(HttpStatus.OK).json({ success: true, data: result });
  }
}
