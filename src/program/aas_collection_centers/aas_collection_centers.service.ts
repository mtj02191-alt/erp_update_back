import { Injectable } from "@nestjs/common";
import { CreateAasCollectionCenterDto } from "./dto/create-aas_collection_center.dto";
import { UpdateAasCollectionCenterDto } from "./dto/update-aas_collection_center.dto";

@Injectable()
export class AasCollectionCentersService {
  create(createAasCollectionCenterDto: CreateAasCollectionCenterDto) {
    return "This action adds a new aasCollectionCenter";
  }

  findAll() {
    return `This action returns all aasCollectionCenters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aasCollectionCenter`;
  }

  update(
    id: number,
    updateAasCollectionCenterDto: UpdateAasCollectionCenterDto,
  ) {
    return `This action updates a #${id} aasCollectionCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} aasCollectionCenter`;
  }
}
