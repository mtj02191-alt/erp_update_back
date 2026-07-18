import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDonor } from "./entities/user_donor.entity";
import { CreateUserDonorDto } from "./dto/create-user_donor.dto";
import {
  UpdateUserDonorDto,
  TransferDonorDto,
  AssignDonorDto,
} from "./dto/update-user_donor.dto";

@Injectable()
export class UserDonorsService {
  constructor(
    @InjectRepository(UserDonor)
    private userDonorRepository: Repository<UserDonor>,
  ) {}

  async create(createUserDonorDto: CreateUserDonorDto): Promise<UserDonor> {
    // Check if assignment already exists
    const existing = await this.userDonorRepository.findOne({
      where: {
        user_id: createUserDonorDto.user_id,
        donor_id: createUserDonorDto.donor_id,
      },
    });

    if (existing) {
      throw new ConflictException("Donor is already assigned to this user");
    }

    const assignment = this.userDonorRepository.create(createUserDonorDto);
    return await this.userDonorRepository.save(assignment);
  }

  async findAll(
    page = 1,
    pageSize = 10,
    status?: string,
  ): Promise<{ data: UserDonor[]; pagination: any }> {
    const queryBuilder = this.userDonorRepository
      .createQueryBuilder("userDonor")
      .leftJoinAndSelect("userDonor.user", "user")
      .leftJoinAndSelect("userDonor.donor", "donor")
      .leftJoinAndSelect("userDonor.assignedByUser", "assignedByUser");

    if (status) {
      queryBuilder.andWhere("userDonor.status = :status", { status });
    }

    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    queryBuilder.orderBy("userDonor.assigned_at", "DESC");

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<UserDonor> {
    const assignment = await this.userDonorRepository.findOne({
      where: { id },
      relations: ["user", "donor", "assignedByUser"],
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    return assignment;
  }

  async getUserAssignedDonors(
    userId: number,
    status = "active",
  ): Promise<UserDonor[]> {
    return await this.userDonorRepository.find({
      where: { user_id: userId, status },
      relations: ["donor"],
      order: { assigned_at: "DESC" },
    });
  }

  async getDonorAssignedUsers(
    donorId: number,
    status = "active",
  ): Promise<UserDonor[]> {
    return await this.userDonorRepository.find({
      where: { donor_id: donorId, status },
      relations: ["user"],
      order: { assigned_at: "DESC" },
    });
  }

  async update(
    id: number,
    updateUserDonorDto: UpdateUserDonorDto,
  ): Promise<UserDonor> {
    const assignment = await this.userDonorRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    Object.assign(assignment, updateUserDonorDto);
    return await this.userDonorRepository.save(assignment);
  }

  async transferDonor(
    transferDto: TransferDonorDto,
  ): Promise<{ oldAssignment: UserDonor; newAssignment: UserDonor }> {
    // Find current assignment
    const currentAssignment = await this.userDonorRepository.findOne({
      where: {
        user_id: transferDto.from_user_id,
        donor_id: transferDto.donor_id,
        status: "active",
      },
    });

    if (!currentAssignment) {
      throw new NotFoundException("Active assignment not found");
    }

    // Check if donor is already assigned to target user
    const existingAssignment = await this.userDonorRepository.findOne({
      where: {
        user_id: transferDto.to_user_id,
        donor_id: transferDto.donor_id,
        status: "active",
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        "Donor is already assigned to the target user",
      );
    }

    // Deactivate current assignment
    currentAssignment.status = "transferred";
    currentAssignment.notes = transferDto.notes || currentAssignment.notes;
    const oldAssignment =
      await this.userDonorRepository.save(currentAssignment);

    // Create new assignment
    const newAssignment = this.userDonorRepository.create({
      user_id: transferDto.to_user_id,
      donor_id: transferDto.donor_id,
      assigned_by: transferDto.assigned_by,
      notes: transferDto.notes,
      status: "active",
    });

    const savedNewAssignment =
      await this.userDonorRepository.save(newAssignment);

    return {
      oldAssignment,
      newAssignment: savedNewAssignment,
    };
  }

  async assignDonor(assignDto: AssignDonorDto): Promise<UserDonor> {
    return await this.create(assignDto);
  }

  async remove(id: number): Promise<UserDonor> {
    const assignment = await this.userDonorRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    assignment.status = "inactive";
    return await this.userDonorRepository.save(assignment);
  }

  async getAssignmentStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    transferred: number;
  }> {
    const [total, active, inactive, transferred] = await Promise.all([
      this.userDonorRepository.count(),
      this.userDonorRepository.count({ where: { status: "active" } }),
      this.userDonorRepository.count({ where: { status: "inactive" } }),
      this.userDonorRepository.count({ where: { status: "transferred" } }),
    ]);

    return { total, active, inactive, transferred };
  }
}
