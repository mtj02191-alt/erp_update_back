import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateTargetDto } from "./dto/create-target.dto";
import { UpdateTargetDto } from "./dto/update-target.dto";
import { User } from "src/users/user.entity";
import { Repository } from "typeorm";
import { Target } from "./entities/target.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class TargetsService {
  constructor(
    @InjectRepository(Target)
    private readonly targetsRepository: Repository<Target>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "year",
      "program",
      "target",
      "reached",
      "target_type",
      "created_at",
      "updated_at",
      "is_archived",
    ]);
    if (!sortField || !allowed.has(sortField)) return "created_at";
    return sortField;
  }

  private normalizeSortOrder(sortOrder?: string) {
    return sortOrder === "ASC" ? "ASC" : "DESC";
  }

  async create(createTargetDto: any, user: any) {
    try {
      // Check if this is a multiple targets request
      if (createTargetDto.targets && Array.isArray(createTargetDto.targets)) {
        return this.createMultiple(createTargetDto.targets, user);
      }

      // Single target creation
      const target = this.targetsRepository.create({
        ...createTargetDto,
        created_by: user,
      });
      const savedTarget = await this.targetsRepository.save(target);

      return {
        success: true,
        message: "Target created successfully",
        data: savedTarget,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createMultiple(targetsData: any[], user: any) {
    try {
      const targets = [];

      for (const targetData of targetsData) {
        const target = this.targetsRepository.create({
          ...targetData,
          created_by: user,
        });
        targets.push(target);
      }

      const savedTargets = await this.targetsRepository.save(targets);

      return {
        success: true,
        message: `Successfully created ${savedTargets.length} targets`,
        data: savedTargets,
        count: savedTargets.length,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to create multiple targets: ${error.message}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "created_at",
    sortOrder: string = "DESC",
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const safeSortField = this.normalizeSortField(sortField);
      const safeSortOrder = this.normalizeSortOrder(sortOrder);

      const [targets, total] = await this.targetsRepository.findAndCount({
        skip: skip,
        take: pageSize,
        order: { [safeSortField]: safeSortOrder },
        relations: ["created_by", "updated_by"],
      });

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: targets,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: number) {
    try {
      const target = await this.targetsRepository.findOne({
        where: { id: id },
        relations: ["created_by", "updated_by"],
      });

      if (!target) {
        throw new BadRequestException("Target not found");
      }

      return {
        success: true,
        data: target,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: number, updateTargetDto: UpdateTargetDto, user: User) {
    try {
      const existingTarget = await this.targetsRepository.findOne({
        where: { id: id },
      });
      if (!existingTarget) {
        throw new BadRequestException("Target not found");
      }

      const updateData = { ...updateTargetDto, updated_by: user };
      await this.targetsRepository.update(id, updateData);

      const updatedTarget = await this.targetsRepository.findOne({
        where: { id: id },
        relations: ["created_by", "updated_by"],
      });

      return {
        success: true,
        message: "Target updated successfully",
        data: updatedTarget,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: number) {
    try {
      const target = await this.targetsRepository.findOne({
        where: { id: id },
      });
      if (!target) {
        throw new BadRequestException("Target not found");
      }

      await this.targetsRepository.delete(id);

      return {
        success: true,
        message: "Target deleted successfully",
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
