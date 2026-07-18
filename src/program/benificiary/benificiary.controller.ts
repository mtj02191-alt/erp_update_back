import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { BenificiaryService } from "./benificiary.service";
import { CreateBenificiaryDto } from "./dto/create-benificiary.dto";
import { UpdateBenificiaryDto } from "./dto/update-benificiary.dto";

@Controller("benificiary")
export class BenificiaryController {
  constructor(private readonly benificiaryService: BenificiaryService) {}

  @Post()
  create(@Body() createBenificiaryDto: CreateBenificiaryDto) {
    return this.benificiaryService.create(createBenificiaryDto);
  }

  @Get()
  findAll() {
    return this.benificiaryService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.benificiaryService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateBenificiaryDto: UpdateBenificiaryDto,
  ) {
    return this.benificiaryService.update(+id, updateBenificiaryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.benificiaryService.remove(+id);
  }
}
