import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";
import { Application } from "./entities/application.entity";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    try {
      // Create new application instance
      const application = this.applicationRepository.create({
        applicant_name: createApplicationDto.applicant_name,
        email: createApplicationDto.email,
        phone_number: createApplicationDto.phone_number,
        resume_url:
          createApplicationDto.resume_url ||
          "https://dummy-resume-url.com/resume.pdf", // Dummy URL for now
        cover_letter: createApplicationDto.cover_letter,
        job_id: createApplicationDto.job_id || null,
      });

      // Save to database
      const savedApplication =
        await this.applicationRepository.save(application);

      return savedApplication;
    } catch (error) {
      console.log("error 2134", error);
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        throw new BadRequestException(
          "An application with this email already exists",
        );
      }

      throw new InternalServerErrorException("Failed to create application");
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "created_at",
    sortOrder: string = "DESC",
    job_id?: number,
  ) {
    try {
      const skip = (page - 1) * pageSize;

      // Build where clause for filtering
      const whereClause: any = {};
      if (job_id) {
        whereClause.job_id = job_id;
      }

      const [applications, total] =
        await this.applicationRepository.findAndCount({
          where: whereClause,
          skip: skip,
          take: pageSize,
          order: { [sortField]: sortOrder },
          relations: ["created_by", "updated_by"],
        });

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: applications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
        filters: {
          job_id: job_id || null,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: number) {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: id },
        relations: ["created_by", "updated_by"],
      });

      if (!application) {
        throw new BadRequestException("Application not found");
      }

      return {
        success: true,
        data: application,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: number, updateApplicationDto: UpdateApplicationDto) {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: id },
      });

      if (!application) {
        throw new BadRequestException("Application not found");
      }

      // Update application with new data
      Object.assign(application, updateApplicationDto);

      const updatedApplication =
        await this.applicationRepository.save(application);

      return {
        success: true,
        message: "Application updated successfully",
        data: updatedApplication,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: number) {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: id },
      });

      if (!application) {
        throw new BadRequestException("Application not found");
      }

      await this.applicationRepository.remove(application);

      return {
        success: true,
        message: "Application deleted successfully",
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
