import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateStoreDto } from "../dto/create-store.dto/create-store.dto";
import { User, UserRole } from "../../users/user.entity";
import { StoreDailyReportEntity } from "../store_daily_reports/entities/store-daily-report.entity";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: "asc" | "desc";
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(StoreDailyReportEntity)
    private storeReportsRepository: Repository<StoreDailyReportEntity>,
  ) {}

  async create(createDto: CreateStoreDto, user: User) {
    const entity = this.storeReportsRepository.create(createDto);
    return this.storeReportsRepository.save(entity);
  }

  async findAll(user: User, options?: PaginationOptions) {
    try {
      const {
        page = 1,
        pageSize = 10,
        sortField = "created_at",
        sortOrder = "desc",
      } = options || {};

      const skip = (page - 1) * pageSize;

      const [data, total] = await this.storeReportsRepository.findAndCount({
        skip,
        take: pageSize,
        order: {
          [sortField]: sortOrder.toUpperCase(),
        },
        relations: ["user"],
      });

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
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async findOne(id: number, user: User) {
    const entity = await this.storeReportsRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException("Store record not found");
    }
    return entity;
  }

  async update(id: number, updateDto: Partial<CreateStoreDto>, user: User) {
    const entity = await this.findOne(id, user);
    await this.storeReportsRepository.update(id, updateDto);
    return this.findOne(id, user);
  }

  async remove(id: number, user: User) {
    const entity = await this.findOne(id, user);
    return this.storeReportsRepository.remove(entity);
  }
}
