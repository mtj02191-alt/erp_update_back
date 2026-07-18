import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { CreateVolunteerDto } from "./dto/create-volunteer.dto";
import { UpdateVolunteerDto } from "./dto/update-volunteer.dto";

@Controller("register_volunteer")
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  @Post()
  async create(@Body() createVolunteerDto: CreateVolunteerDto) {
    return await this.volunteerService.create(createVolunteerDto);
  }

  @Get()
  async findAll() {
    return await this.volunteerService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.volunteerService.findOne(+id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateVolunteerDto: UpdateVolunteerDto,
  ) {
    return await this.volunteerService.update(+id, updateVolunteerDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.volunteerService.remove(+id);
    return { message: "Volunteer deleted successfully" };
  }
}
