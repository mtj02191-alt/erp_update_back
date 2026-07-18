import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { CreateApplicationDto } from "../applications/dto/create-application.dto";
import { UpdateApplicationDto } from "../applications/dto/update-application.dto";
import { JobStatus, JobType } from "./entities/job.entity";
// import { ConditionalJwtGuard } from '../../../../auth/guards/conditional-jwt.guard';
import { PermissionsGuard } from "../../../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../../../permissions";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /jobs - Get all jobs with filtering and pagination
   * Public endpoint (no auth required)
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 10)
   * - department: string (optional)
   * - type: string - 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' (optional, URL-safe enum keys)
   */
  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("department") department?: string,
    @Query("type") type?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      // Convert type string to JobType enum if provided
      let jobType: JobType | undefined;
      if (type) {
        const typeMap: { [key: string]: JobType } = {
          FULL_TIME: JobType.FULL_TIME,
          PART_TIME: JobType.PART_TIME,
          CONTRACT: JobType.CONTRACT,
        };
        jobType = typeMap[type.toUpperCase()];
        if (!jobType) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: `Invalid type. Must be one of: FULL_TIME, PART_TIME, CONTRACT`,
            data: null,
          });
        }
      }

      const result = await this.jobsService.findAll(
        pageNum,
        limitNum,
        {
          department,
          type: jobType,
        },
        null,
      );

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  /**
   * GET /jobs/:id - Get single job by ID or slug
   * Public endpoint (no auth required)
   */
  @Get(":id")
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const job = await this.jobsService.findOne(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: job,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * POST /jobs - Create a new job posting
   */
  @Post()
  // @UseGuards( PermissionsGuard)
  @RequiredPermissions(["hr.jobs.create", "super_admin"])
  async create(@Body() createJobDto: CreateJobDto, @Res() res: Response) {
    try {
      const job = await this.jobsService.create(createJobDto, null);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Job created successfully",
        data: job,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * PATCH /jobs/:id - Update existing job
   */
  @Patch(":id")
  // @UseGuards( PermissionsGuard)
  @RequiredPermissions(["hr.jobs.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Res() res: Response,
  ) {
    try {
      const job = await this.jobsService.update(+id, updateJobDto, null);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Job updated successfully",
        data: job,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  /**
   * DELETE /jobs/:id - Soft delete (archive) a job
   */
  @Delete(":id")
  // @UseGuards( PermissionsGuard)
  @RequiredPermissions(["hr.jobs.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.jobsService.remove(+id, null);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Job deleted successfully",
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /jobs/:jobId/apply - Submit a job application
   * Public endpoint (no auth required)
   */
  // @Post(':jobId/apply')
  // @UseInterceptors(FileInterceptor('cvResume'))
  // async apply(
  //   @Param('jobId') jobId: string,
  //   @Body() createApplicationDto: CreateJobApplicationDto,
  //   @UploadedFile() file: Express.Multer.File,
  //   @Res() res: Response,
  // ) {
  //   try {
  //     const application = await this.jobsService.createApplication(
  //       +jobId,
  //       createApplicationDto,
  //       file,
  //     );

  //     return res.status(HttpStatus.CREATED).json({
  //       success: true,
  //       message: 'Application submitted successfully',
  //       data: {
  //         applicationId: application.id,
  //         status: application.status,
  //       },
  //     });
  //   } catch (error) {
  //     return res.status(HttpStatus.BAD_REQUEST).json({
  //       success: false,
  //       message: error.message,
  //       data: null,
  //     });
  //   }
  // }
}
