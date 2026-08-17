import { Injectable } from '@nestjs/common';
import { CreateCrowdFundingDto } from './dto/create-crowd_funding.dto';
import { UpdateCrowdFundingDto } from './dto/update-crowd_funding.dto';

@Injectable()
export class CrowdFundingService {
  create(createCrowdFundingDto: CreateCrowdFundingDto) {
    return 'This action adds a new crowdFunding';
  }

  findAll() {
    return `This action returns all crowdFunding`;
  }

  findOne(id: number) {
    return `This action returns a #${id} crowdFunding`;
  }

  update(id: number, updateCrowdFundingDto: UpdateCrowdFundingDto) {
    return `This action updates a #${id} crowdFunding`;
  }

  remove(id: number) {
    return `This action removes a #${id} crowdFunding`;
  }
}
