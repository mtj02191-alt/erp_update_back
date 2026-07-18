import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { SubProjectsService } from "./sub_projects.service";
import { CreateSubProjectDto } from "./dto/create-sub_project.dto";
import { UpdateSubProjectDto } from "./dto/update-sub_project.dto";

@Controller("sub-projects")
export class SubProjectsController {
  constructor(private readonly subProjectsService: SubProjectsService) {}

  @Post()
  create(@Body() createSubProjectDto: CreateSubProjectDto) {
    return this.subProjectsService.create(createSubProjectDto);
  }

  @Get()
  findAll() {
    return this.subProjectsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.subProjectsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateSubProjectDto: UpdateSubProjectDto,
  ) {
    return this.subProjectsService.update(+id, updateSubProjectDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.subProjectsService.remove(+id);
  }
}
