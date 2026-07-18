import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { MisService } from "./mis.service";
import { CreateMiDto } from "./dto/create-mi.dto";
import { UpdateMiDto } from "./dto/update-mi.dto";

@Controller("mis")
export class MisController {
  constructor(private readonly misService: MisService) {}

  @Post()
  create(@Body() createMiDto: CreateMiDto) {
    return this.misService.create(createMiDto);
  }

  @Get()
  findAll() {
    return this.misService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.misService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateMiDto: UpdateMiDto) {
    return this.misService.update(+id, updateMiDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.misService.remove(+id);
  }
}
