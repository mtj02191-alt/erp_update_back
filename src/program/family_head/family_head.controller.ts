import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { FamilyHeadService } from "./family_head.service";
import { CreateFamilyHeadDto } from "./dto/create-family_head.dto";
import { UpdateFamilyHeadDto } from "./dto/update-family_head.dto";

@Controller("family-head")
export class FamilyHeadController {
  constructor(private readonly familyHeadService: FamilyHeadService) {}

  @Post()
  create(@Body() createFamilyHeadDto: CreateFamilyHeadDto) {
    return this.familyHeadService.create(createFamilyHeadDto);
  }

  @Get()
  findAll() {
    return this.familyHeadService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.familyHeadService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateFamilyHeadDto: UpdateFamilyHeadDto,
  ) {
    return this.familyHeadService.update(+id, updateFamilyHeadDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.familyHeadService.remove(+id);
  }
}
