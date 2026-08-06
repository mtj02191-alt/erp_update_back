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
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from "@nestjs/common";
import { CeoNotesService } from "./ceo-notes.service";
import { CreateCeoNoteDto } from "./dto/create-ceo-note.dto";
import { UpdateCeoNoteDto } from "./dto/update-ceo-note.dto";
import { ApproveNoteDto } from "./dto/approve-note.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
import { BulkApproveDto } from "./dto/bulk-approve.dto";
import { BulkConvertToTaskDto } from "./dto/bulk-convert-to-task.dto";
import { CeoNotesQueryDto } from "./dto/ceo-notes-query.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { ReportType } from "./ceo-note-report.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../users/user.entity";
import { ProjectCommandSheetsService } from "./project-command-sheets.service";
import { VisitorsService } from "./visitors.service";

@Controller("ceo-notes")
@UseGuards(JwtGuard, RolesGuard)
export class CeoNotesController {
  constructor(private readonly ceoNotesService: CeoNotesService) {}

  @Post()
  create(
    @Body() createCeoNoteDto: CreateCeoNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.create(createCeoNoteDto, currentUser);
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() query: CeoNotesQueryDto, @CurrentUser() currentUser: User) {
    return this.ceoNotesService.findAll(query, currentUser);
  }

  @Get("instruction-register")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getInstructionRegister(@Query() query: CeoNotesQueryDto) {
    return this.ceoNotesService.getInstructionRegister(query);
  }

  @Post("bulk-approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO, UserRole.PA)
  bulkApprove(
    @Body() bulkApproveDto: BulkApproveDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.bulkApprove(bulkApproveDto, currentUser);
  }

  @Post("bulk-convert-to-task")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO, UserRole.PA)
  bulkConvertToTask(
    @Body() bulkConvertToTaskDto: BulkConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.bulkConvertToTask(
      bulkConvertToTaskDto,
      currentUser,
    );
  }

  

  @Get("dashboard/stats")
  getDashboardStats(
    @CurrentUser() currentUser: User,
    @Query("category") category?: string,
  ) {
    return this.ceoNotesService.getDashboardStats(currentUser, category);
  }

  @Get("reports/:type")
  getReport(
    @Param("type") type: string,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
  ) {
    return this.ceoNotesService.generateReport(type as ReportType, startDate, endDate);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.ceoNotesService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCeoNoteDto: UpdateCeoNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.update(id, updateCeoNoteDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO, UserRole.PA)
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.ceoNotesService.remove(id, currentUser);
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CEO)
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() approveNoteDto: ApproveNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.approve(id, approveNoteDto, currentUser);
  }

  @Post(":id/convert-to-task")
  convertToTask(
    @Param("id", ParseIntPipe) id: number,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.convertToTask(
      id,
      convertToTaskDto,
      currentUser,
    );
  }

  @Get(":id/audit-history")
  getAuditHistory(@Param("id", ParseIntPipe) id: number) {
    return this.ceoNotesService.getAuditHistory(id);
  }
}
