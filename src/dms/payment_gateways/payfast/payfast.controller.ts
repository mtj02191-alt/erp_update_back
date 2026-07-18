import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { PayfastService } from "./payfast.service";
import { CreatePayfastDto } from "./dto/create-payfast.dto";
import { UpdatePayfastDto } from "./dto/update-payfast.dto";

@Controller("payfast")
export class PayfastController {
  constructor(private readonly payfastService: PayfastService) {}

  @Post()
  create(@Body() createPayfastDto: CreatePayfastDto) {
    return this.payfastService.create(createPayfastDto);
  }

  @Get()
  findAll() {
    return this.payfastService.getAccessToken();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.payfastService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updatePayfastDto: UpdatePayfastDto) {
    return this.payfastService.update(+id, updatePayfastDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.payfastService.remove(+id);
  }
}
