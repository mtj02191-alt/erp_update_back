import { Injectable } from "@nestjs/common";
import { CreateBenificiaryDto } from "./dto/create-benificiary.dto";
import { UpdateBenificiaryDto } from "./dto/update-benificiary.dto";

@Injectable()
export class BenificiaryService {
  create(createBenificiaryDto: CreateBenificiaryDto) {
    return "This action adds a new benificiary";
  }

  findAll() {
    return `This action returns all benificiary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} benificiary`;
  }

  update(id: number, updateBenificiaryDto: UpdateBenificiaryDto) {
    return `This action updates a #${id} benificiary`;
  }

  remove(id: number) {
    return `This action removes a #${id} benificiary`;
  }
}
