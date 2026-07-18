import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { DmsService } from "./dms.service";
import { CreateDmDto } from "./dto/create-dm.dto";
import { UpdateDmDto } from "./dto/update-dm.dto";

@Controller("dms")
export class DmsController {
  constructor(private readonly dmsService: DmsService) {}

  @Post()
  create(@Body() createDmDto: CreateDmDto) {
    return this.dmsService.create(createDmDto);
  }

  @Get()
  findAll() {
    return this.dmsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.dmsService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDmDto: UpdateDmDto) {
    return this.dmsService.update(+id, updateDmDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.dmsService.remove(+id);
  }
}
