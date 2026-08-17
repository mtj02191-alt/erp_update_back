import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { ManualRecurringService } from "./manual-recurring.service";
import { ManualRecurringReminderService } from "./manual-recurring-reminder.service";
import { CreateManualRecurringPledgeDto } from "./dto/create-manual-recurring-pledge.dto";
import { UpdateManualRecurringPledgeDto } from "./dto/update-manual-recurring-pledge.dto";
import {
  ManualRecurringPledgeFiltersDto,
  ProcessManualRecurringRemindersDto,
} from "./dto/manual-recurring-filters.dto";
import { JwtGuard } from "../../auth/jwt.guard";

@Controller("manual-recurring-pledges")
@UseGuards(JwtGuard)
export class ManualRecurringController {
  constructor(
    private readonly manualRecurringService: ManualRecurringService,
    private readonly reminderService: ManualRecurringReminderService,
  ) {}

  @Post()
  async create(@Body() dto: CreateManualRecurringPledgeDto, @Res() res: Response) {
    try {
      const data = await this.manualRecurringService.create(dto);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to create pledge",
      });
    }
  }

  @Get()
  async findAll(
    @Query() filters: ManualRecurringPledgeFiltersDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.manualRecurringService.findAll(filters);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch pledges",
      });
    }
  }

  @Get("donor/:donorId")
  async findByDonor(
    @Param("donorId", ParseIntPipe) donorId: number,
    @Res() res: Response,
  ) {
    try {
      const data = await this.manualRecurringService.findByDonorId(donorId);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch donor pledges",
      });
    }
  }

  /** Manual trigger for monthly reminder job (same logic as cron on 2nd). */
  @Post("process-reminders")
  async processReminders(
    @Body() dto: ProcessManualRecurringRemindersDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.reminderService.processMonthlyReminders(dto);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to process reminders",
      });
    }
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const data = await this.manualRecurringService.findOne(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to fetch pledge",
      });
    }
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateManualRecurringPledgeDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.manualRecurringService.update(id, dto);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to update pledge",
      });
    }
  }

  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.manualRecurringService.remove(id);
      return res.status(200).json({ success: true, message: "Pledge archived" });
    } catch (error: any) {
      const status = error?.status || 500;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to archive pledge",
      });
    }
  }
}
