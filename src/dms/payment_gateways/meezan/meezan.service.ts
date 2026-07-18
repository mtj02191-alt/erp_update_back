import { Injectable } from "@nestjs/common";
import { CreateMeezanDto } from "./dto/create-meezan.dto";
import { UpdateMeezanDto } from "./dto/update-meezan.dto";

@Injectable()
export class MeezanService {
  create(createMeezanDto: CreateMeezanDto) {
    return "This action adds a new meezan";
  }

  findAll() {
    return `This action returns all meezan`;
  }

  findOne(id: number) {
    return `This action returns a #${id} meezan`;
  }

  update(id: number, updateMeezanDto: UpdateMeezanDto) {
    return `This action updates a #${id} meezan`;
  }

  remove(id: number) {
    return `This action removes a #${id} meezan`;
  }
}
