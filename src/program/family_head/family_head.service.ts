import { Injectable } from "@nestjs/common";
import { CreateFamilyHeadDto } from "./dto/create-family_head.dto";
import { UpdateFamilyHeadDto } from "./dto/update-family_head.dto";

@Injectable()
export class FamilyHeadService {
  create(createFamilyHeadDto: CreateFamilyHeadDto) {
    return "This action adds a new familyHead";
  }

  findAll() {
    return `This action returns all familyHead`;
  }

  findOne(id: number) {
    return `This action returns a #${id} familyHead`;
  }

  update(id: number, updateFamilyHeadDto: UpdateFamilyHeadDto) {
    return `This action updates a #${id} familyHead`;
  }

  remove(id: number) {
    return `This action removes a #${id} familyHead`;
  }
}
