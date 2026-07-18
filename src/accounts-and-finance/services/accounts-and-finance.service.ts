import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountsAndFinanceEntity } from "../entities/accounts-and-finance.entity/accounts-and-finance.entity";
import { CreateAccountsAndFinanceDto } from "../dto/create-accounts-and-finance.dto/create-accounts-and-finance.dto";

@Injectable()
export class AccountsAndFinanceService {
  constructor(
    @InjectRepository(AccountsAndFinanceEntity)
    private accountsAndFinanceRepository: Repository<AccountsAndFinanceEntity>,
  ) {}

  async create(createDto: CreateAccountsAndFinanceDto) {
    try {
      const entity = this.accountsAndFinanceRepository.create(createDto);
      return await this.accountsAndFinanceRepository.save(entity);
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to create accounts and finance record",
      );
    }
  }

  async findAll() {
    try {
      return await this.accountsAndFinanceRepository.find();
    } catch (error) {
      throw new InternalServerErrorException(
        "Failed to fetch accounts and finance records",
      );
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.accountsAndFinanceRepository.findOne({
        where: { id },
      });
      if (!record) {
        throw new NotFoundException(
          `Accounts and finance record with ID ${id} not found`,
        );
      }
      return record;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to fetch accounts and finance record",
      );
    }
  }

  async update(id: number, updateDto: Partial<CreateAccountsAndFinanceDto>) {
    try {
      const record = await this.findOne(id);
      await this.accountsAndFinanceRepository.update(id, updateDto);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to update accounts and finance record",
      );
    }
  }

  async remove(id: number) {
    try {
      const record = await this.findOne(id);
      return await this.accountsAndFinanceRepository.remove(record);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to delete accounts and finance record",
      );
    }
  }
}
