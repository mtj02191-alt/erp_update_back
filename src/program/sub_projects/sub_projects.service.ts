import { Injectable } from "@nestjs/common";
import { CreateSubProjectDto } from "./dto/create-sub_project.dto";
import { UpdateSubProjectDto } from "./dto/update-sub_project.dto";

@Injectable()
export class SubProjectsService {
  create(createSubProjectDto: CreateSubProjectDto) {
    return "This action adds a new subProject";
  }

  findAll() {
    return `This action returns all subProjects`;
  }

  findOne(id: number) {
    return `This action returns a #${id} subProject`;
  }

  update(id: number, updateSubProjectDto: UpdateSubProjectDto) {
    return `This action updates a #${id} subProject`;
  }

  remove(id: number) {
    return `This action removes a #${id} subProject`;
  }
}
