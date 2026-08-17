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
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import {
  DONATION_CREATE_GUARD,
  DONATION_DELETE_GUARD,
  DONATION_FILTER_OPTIONS_GUARD,
  DONATION_UPDATE_GUARD,
  DONATION_VIEW_GUARD,
  RequiredPermissions,
} from "src/permissions";
import { CurrentUser } from "src/auth/current-user.decorator";

import { ProgressWorkflowTemplatesService } from "./progress-workflow-templates.service";
import { CreateWorkflowTemplateDto } from "./dto/create-workflow-template.dto";
import { UpdateWorkflowTemplateDto } from "./dto/update-workflow-template.dto";
import { CreateTemplateStepDto } from "./dto/create-template-step.dto";
import { ReorderTemplateStepsDto } from "./dto/reorder-template-steps.dto";

@Controller("progress/workflow-templates")
@UseGuards(JwtGuard, PermissionsGuard)
export class ProgressWorkflowTemplatesController {
  constructor(private readonly service: ProgressWorkflowTemplatesService) {}

  @Post()
  @RequiredPermissions([...DONATION_CREATE_GUARD])
  async create(
    @Body() dto: CreateWorkflowTemplateDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.create(dto, user);
    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Template created", data });
  }

  @Get()
  @RequiredPermissions([...DONATION_VIEW_GUARD])
  async list(@Res() res: Response) {
    const data = await this.service.findAll();
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Templates retrieved", data });
  }

  @Get("options")
  @RequiredPermissions([...DONATION_FILTER_OPTIONS_GUARD])
  async options(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("active") active?: string,
    @Res() res?: Response,
  ) {
    const data = await this.service.listForOptions({
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      activeOnly: active !== "false",
    });
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Template options retrieved",
      data,
    });
  }

  @Get(":id")
  @RequiredPermissions([...DONATION_VIEW_GUARD])
  async detail(@Param("id") id: string, @Res() res: Response) {
    const data = await this.service.findOne(+id);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Template retrieved", data });
  }

  @Patch(":id")
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.update(+id, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Template updated", data });
  }

  @Delete(":id")
  @RequiredPermissions([...DONATION_DELETE_GUARD])
  async archive(
    @Param("id") id: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.archive(+id, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Template archived", data });
  }

  @Post(":id/steps")
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async addStep(
    @Param("id") id: string,
    @Body() dto: CreateTemplateStepDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.addStep(+id, dto, user);
    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Template step created", data });
  }

  @Patch("steps/:stepId")
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async updateStep(
    @Param("stepId") stepId: string,
    @Body() dto: Partial<CreateTemplateStepDto>,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.updateStep(+stepId, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Template step updated", data });
  }

  @Delete("steps/:stepId")
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async archiveStep(
    @Param("stepId") stepId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.archiveStep(+stepId, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Template step archived", data });
  }

  @Post(":id/steps/reorder")
  @RequiredPermissions([...DONATION_UPDATE_GUARD])
  async reorder(
    @Param("id") id: string,
    @Body() dto: ReorderTemplateStepsDto,
    @Res() res: Response,
    @CurrentUser() user: any,
  ) {
    const data = await this.service.reorderSteps(+id, dto, user);
    return res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Steps reordered", data });
  }
}
