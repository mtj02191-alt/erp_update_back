import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { GeographicService } from "./geographic.service";
import { CreateGeographicDto } from "./dto/create-geographic.dto";
import { UpdateGeographicDto } from "./dto/update-geographic.dto";

@Controller("geographic")
export class GeographicController {
  constructor(private readonly geographicService: GeographicService) {}

  @Post()
  create(@Body() createGeographicDto: CreateGeographicDto) {
    return this.geographicService.create(createGeographicDto);
  }

  @Get()
  findAll() {
    return this.geographicService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.geographicService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateGeographicDto: UpdateGeographicDto,
  ) {
    return this.geographicService.update(+id, updateGeographicDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.geographicService.remove(+id);
  }
}
