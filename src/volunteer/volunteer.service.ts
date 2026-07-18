import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateVolunteerDto } from "./dto/create-volunteer.dto";
import { UpdateVolunteerDto } from "./dto/update-volunteer.dto";
import { Volunteer } from "./entities/volunteer.entity";
import {
  applyCommonFilters,
  FilterPayload,
} from "../utils/filters/common-filter.util";

@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(Volunteer)
    private readonly volunteerRepository: Repository<Volunteer>,
  ) {}

  // ─── Public (website) — unchanged ────────────────────────────
  async create(createVolunteerDto: CreateVolunteerDto): Promise<Volunteer> {
    const volunteer = this.volunteerRepository.create(createVolunteerDto);
    return await this.volunteerRepository.save(volunteer);
  }

  // ─── DMS: Paginated list with search & filters ───────────────
  async findAllPaginated(options: any) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortField = "created_at",
        sortOrder = "DESC",
        search = "",
        category = "",
        availability = "",
        source = "",
        status = "",
        gender = "",
        city = "",
        verification_status = "",
        start_date,
        end_date,
      } = options;

      const skip = (page - 1) * pageSize;

      const searchFields = [
        "name",
        "email",
        "phone",
        "cnic",
        "city",
        "area",
        "comments",
        "motivation",
      ];

      const queryBuilder =
        this.volunteerRepository.createQueryBuilder("volunteer");

      // Apply common filters
      const filters: FilterPayload = {
        search,
        category,
        availability,
        source,
        status,
        gender,
        city,
        verification_status,
        start_date,
        end_date,
      };

      applyCommonFilters(queryBuilder, filters, searchFields, "volunteer");

      queryBuilder.andWhere("volunteer.is_archived = :is_archived", {
        is_archived: false,
      });

      // Sorting
      const validSortFields = [
        "name",
        "email",
        "phone",
        "category",
        "availability",
        "source",
        "status",
        "city",
        "gender",
        "created_at",
        "verification_status",
        "assigned_department",
      ];
      const sortFieldName = validSortFields.includes(sortField)
        ? sortField
        : "created_at";
      queryBuilder.orderBy(`volunteer.${sortFieldName}`, sortOrder);

      // Pagination
      queryBuilder.skip(skip).take(pageSize);

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new NotFoundException(
        `Failed to retrieve volunteers: ${error.message}`,
      );
    }
  }

  // ─── Simple findAll (backward compat for public API) ─────────
  async findAll(): Promise<Volunteer[]> {
    return await this.volunteerRepository.find({
      where: { is_archived: false },
      order: { created_at: "DESC" },
    });
  }

  async findOne(id: number): Promise<Volunteer> {
    const volunteer = await this.volunteerRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!volunteer) {
      throw new NotFoundException(`Volunteer with ID ${id} not found`);
    }
    return volunteer;
  }

  async update(
    id: number,
    updateVolunteerDto: UpdateVolunteerDto,
  ): Promise<Volunteer> {
    const volunteer = await this.findOne(id);
    Object.assign(volunteer, updateVolunteerDto);
    return await this.volunteerRepository.save(volunteer);
  }

  async remove(id: number): Promise<{ message: string }> {
    const volunteer = await this.findOne(id);
    volunteer.is_archived = true;
    await this.volunteerRepository.save(volunteer);
    return { message: "Volunteer deleted successfully" };
  }
}
