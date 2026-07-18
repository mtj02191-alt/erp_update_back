import { Injectable } from "@nestjs/common";
import { CreateGeographicDto } from "./dto/create-geographic.dto";
import { UpdateGeographicDto } from "./dto/update-geographic.dto";

@Injectable()
export class GeographicService {
  create(createGeographicDto: CreateGeographicDto) {
    return "This action adds a new geographic";
  }

  findAll() {
    return `This action returns all geographic`;
  }

  findOne(id: number) {
    return `This action returns a #${id} geographic`;
  }

  update(id: number, updateGeographicDto: UpdateGeographicDto) {
    return `This action updates a #${id} geographic`;
  }

  remove(id: number) {
    return `This action removes a #${id} geographic`;
  }
}
