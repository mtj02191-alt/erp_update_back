import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcurementsEntity } from "../entities/procurements.entity/procurements.entity";
import { CreateProcurementsDto } from "../dto/create-procurements.dto/create-procurements.dto";

@Injectable()
export class ProcurementsService {
  constructor(
    @InjectRepository(ProcurementsEntity)
    private procurementsRepository: Repository<ProcurementsEntity>,
  ) {}

  async create(createDto: CreateProcurementsDto) {
    try {
      const entity = this.procurementsRepository.create({
        ...createDto,
        store_id: createDto.storeId ?? null,
      });
      return await this.procurementsRepository.save(entity);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create procurement record",
      );
    }
  }

  async findAll() {
    try {
      return await this.procurementsRepository.find({
        where: { is_archived: false },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to fetch procurement records",
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.procurementsRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!record) {
        throw new NotFoundException(
          `Procurement record with ID ${id} not found`,
        );
      }
      return record;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to fetch procurement record",
      );
    }
  }

  async update(id: number, updateDto: Partial<CreateProcurementsDto>) {
    try {
      const record = await this.findOne(id);
      await this.procurementsRepository.update(id, updateDto);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to update procurement record",
      );
    }
  }

  async remove(id: number) {
    try {
      const record = await this.findOne(id);
      if (!record) {
        throw new NotFoundException(
          `Procurement record with ID ${id} not found`,
        );
      }
      return await this.procurementsRepository.update(id, {
        is_archived: true,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to delete procurement record",
      );
    }
  }
}
