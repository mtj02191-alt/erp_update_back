import { Injectable } from "@nestjs/common";
import { CreateMiDto } from "./dto/create-mi.dto";
import { UpdateMiDto } from "./dto/update-mi.dto";

@Injectable()
export class MisService {
  create(createMiDto: CreateMiDto) {
    return "This action adds a new mi";
  }

  findAll() {
    return `This action returns all mis`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mi`;
  }

  update(id: number, updateMiDto: UpdateMiDto) {
    return `This action updates a #${id} mi`;
  }

  remove(id: number) {
    return `This action removes a #${id} mi`;
  }
}
