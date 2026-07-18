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
import { CeoNotesService } from "./ceo-notes.service";
import { CreateCeoNoteDto } from "./dto/create-ceo-note.dto";
import { UpdateCeoNoteDto } from "./dto/update-ceo-note.dto";
import { ApproveNoteDto } from "./dto/approve-note.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { User } from "../users/user.entity";

@Controller("ceo-notes")
@UseGuards(JwtGuard)
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
  findAll(@Query() payload: any, @CurrentUser() currentUser: User) {
    return this.ceoNotesService.findAll(payload, currentUser);
  }

  @Get("dashboard/stats")
  getDashboardStats(
    @CurrentUser() currentUser: User,
    @Query("category") category?: string,
  ) {
    return this.ceoNotesService.getDashboardStats(currentUser, category);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ceoNotesService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateCeoNoteDto: UpdateCeoNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.update(+id, updateCeoNoteDto, currentUser);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: User) {
    return this.ceoNotesService.remove(+id, currentUser);
  }

  @Post(":id/approve")
  approve(
    @Param("id") id: string,
    @Body() approveNoteDto: ApproveNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.approve(+id, approveNoteDto, currentUser);
  }

  @Post(":id/convert-to-task")
  convertToTask(
    @Param("id") id: string,
    @Body() convertToTaskDto: ConvertToTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.ceoNotesService.convertToTask(
      +id,
      convertToTaskDto,
      currentUser,
    );
  }

  @Get(":id/audit-history")
  getAuditHistory(@Param("id") id: string) {
    return this.ceoNotesService.getAuditHistory(+id);
  }
}
