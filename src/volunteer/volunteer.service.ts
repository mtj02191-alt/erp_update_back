import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
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

  async findActiveByEmail(email: string): Promise<Volunteer | null> {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;
    return this.volunteerRepository.findOne({
      where: { email: normalized, is_archived: false },
    });
  }

  /**
   * CSV / data-import row — same persistence rules as create().
   */
  async importVolunteerRow(
    row: Record<string, unknown>,
    _user?: any,
  ): Promise<Volunteer> {
    const email = row.email
      ? String(row.email).trim().toLowerCase()
      : undefined;

    if (email) {
      const existing = await this.findActiveByEmail(email);
      if (existing) {
        throw new ConflictException(
          `Volunteer with email ${email} already exists`,
        );
      }
    }

    const createDto = {
      name: row.name,
      phone: row.phone,
      email,
      cnic: row.cnic,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      city: row.city,
      area: row.area,
      availability: row.availability,
      availability_days: row.availability_days,
      hours_per_week: row.hours_per_week,
      willing_to_travel: row.willing_to_travel,
      skills: row.skills,
      interest_areas: row.interest_areas,
      category: row.category,
      motivation: row.motivation,
      emergency_contact_name: row.emergency_contact_name,
      emergency_contact_phone: row.emergency_contact_phone,
      emergency_contact_relation: row.emergency_contact_relation,
      status: row.status,
      assigned_department: row.assigned_department,
      interview_required: row.interview_required,
      verification_status: row.verification_status,
      source: row.source || "import",
      comments: row.comments,
      agreed_to_policy: row.agreed_to_policy ?? true,
      declaration_accurate: row.declaration_accurate ?? true,
    } as CreateVolunteerDto;

    return this.create(createDto);
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
