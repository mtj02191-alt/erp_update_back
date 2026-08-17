import { Module } from '@nestjs/common';
import { CrowdFundingService } from './crowd_funding.service';
import { CrowdFundingController } from './crowd_funding.controller';

@Module({
  controllers: [CrowdFundingController],
  providers: [CrowdFundingService],
})
export class CrowdFundingModule {}
