import { PartialType } from '@nestjs/mapped-types';
import { CreateCrowdFundingDto } from './create-crowd_funding.dto';

export class UpdateCrowdFundingDto extends PartialType(CreateCrowdFundingDto) {}
