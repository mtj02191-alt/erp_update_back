import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { MeezanService } from "./meezan.service";
import { CreateMeezanDto } from "./dto/create-meezan.dto";
import { UpdateMeezanDto } from "./dto/update-meezan.dto";

@Controller("meezan")
export class MeezanController {
  constructor(private readonly meezanService: MeezanService) {}

  @Post()
  create(@Body() createMeezanDto: CreateMeezanDto) {
    return this.meezanService.create(createMeezanDto);
  }

  @Get()
  findAll() {
    return this.meezanService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.meezanService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateMeezanDto: UpdateMeezanDto) {
    return this.meezanService.update(+id, updateMeezanDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.meezanService.remove(+id);
  }
}
