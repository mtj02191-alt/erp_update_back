import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';

@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post()
  create(@Body() createCommunicationDto: CreateCommunicationDto) {
    return this.communicationService.create(createCommunicationDto);
  }

  @Get()
  findAll() {
    return this.communicationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communicationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommunicationDto: UpdateCommunicationDto) {
    return this.communicationService.update(+id, updateCommunicationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.communicationService.remove(+id);
  }
}
