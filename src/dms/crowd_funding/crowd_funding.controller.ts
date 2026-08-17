import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CrowdFundingService } from './crowd_funding.service';
import { CreateCrowdFundingDto } from './dto/create-crowd_funding.dto';
import { UpdateCrowdFundingDto } from './dto/update-crowd_funding.dto';

@Controller('crowd-funding')
export class CrowdFundingController {
  constructor(private readonly crowdFundingService: CrowdFundingService) {}

  @Post()
  create(@Body() createCrowdFundingDto: CreateCrowdFundingDto) {
    return this.crowdFundingService.create(createCrowdFundingDto);
  }

  @Get()
  findAll() {
    return this.crowdFundingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crowdFundingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrowdFundingDto: UpdateCrowdFundingDto) {
    return this.crowdFundingService.update(+id, updateCrowdFundingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crowdFundingService.remove(+id);
  }
}
