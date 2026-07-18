import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { ProcurementsService } from "./services/procurements.service";
import { CreateProcurementsDto } from "./dto/create-procurements.dto/create-procurements.dto";

@Controller("procurements")
export class ProcurementsController {
  constructor(private readonly procurementsService: ProcurementsService) {}

  @Post()
  create(@Body() createDto: CreateProcurementsDto) {
    return this.procurementsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.procurementsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.procurementsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDto: Partial<CreateProcurementsDto>,
  ) {
    return this.procurementsService.update(+id, updateDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.procurementsService.remove(+id);
  }
}
