import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { SurveysService } from "./surveys.service";
import { CreateSurveyDto } from "./dto/create-survey.dto";
import { UpdateSurveyDto } from "./dto/update-survey.dto";
import { AddQuestionsBulkDto } from "./dto/add-question.dto";
import { SubmitSurveyDto } from "./dto/submit-survey.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { ConditionalJwtGuard } from "../../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("surveys")
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // —— Admin ——

  @Post()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.create", "super_admin"])
  async create(
    @Body() createSurveyDto: CreateSurveyDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
          data: null,
        });
      }
      const result = await this.surveysService.create(createSurveyDto, userId);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Survey created successfully",
        data: result,
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

  @Get()
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.list_view", "super_admin"])
  async findAll(@Res() res: Response) {
    try {
      const result = await this.surveysService.findAll();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Surveys retrieved successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Post(":id/questions")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.update", "super_admin"])
  async addQuestions(
    @Param("id") id: string,
    @Body() body: AddQuestionsBulkDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.surveysService.addQuestions(+id, body);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Questions added successfully",
        data: result,
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

  @Patch(":id/activate")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.update", "super_admin"])
  async activate(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.activate(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey activated",
        data: result,
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

  @Patch(":id/close")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.update", "super_admin"])
  async close(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.close(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey closed and report generated",
        data: result,
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

  @Patch(":id/reactivate")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.update", "super_admin"])
  async reactivate(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.reactivate(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey reactivated",
        data: result,
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

  // —— Tablet (Staff) ——

  @Get(":id/form")
  @UseGuards(JwtGuard)
  async getForm(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.getForm(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey form retrieved",
        data: result,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : error.message?.includes("not active")
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post(":id/submit")
  @UseGuards(JwtGuard)
  async submit(
    @Param("id") id: string,
    @Body() body: SubmitSurveyDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
          data: null,
        });
      }
      const result = await this.surveysService.submit(+id, body, userId);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Survey submitted successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : error.message?.includes("not active")
          ? HttpStatus.FORBIDDEN
          : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  // —— Reports (precomputed only) ——

  @Get(":id/report")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.view", "super_admin"])
  async getReport(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.getReport(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey report retrieved",
        data: result,
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

  // —— Admin CRUD (single survey) ——

  @Get(":id")
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.view", "super_admin"])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.surveysService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey retrieved successfully",
        data: result,
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
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.surveysService.update(+id, updateSurveyDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey updated successfully",
        data: result,
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
  @UseGuards(ConditionalJwtGuard, PermissionsGuard)
  @RequiredPermissions(["dms.surveys.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.surveysService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Survey deleted successfully",
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
