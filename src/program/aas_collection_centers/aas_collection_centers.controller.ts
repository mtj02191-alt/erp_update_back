import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { AasCollectionCentersService } from "./aas_collection_centers.service";
import { CreateAasCollectionCenterDto } from "./dto/create-aas_collection_center.dto";
import { UpdateAasCollectionCenterDto } from "./dto/update-aas_collection_center.dto";

@Controller("aas-collection-centers")
export class AasCollectionCentersController {
  constructor(
    private readonly aasCollectionCentersService: AasCollectionCentersService,
  ) {}

  @Post()
  create(@Body() createAasCollectionCenterDto: CreateAasCollectionCenterDto) {
    return this.aasCollectionCentersService.create(
      createAasCollectionCenterDto,
    );
  }

  @Get()
  findAll() {
    return this.aasCollectionCentersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.aasCollectionCentersService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateAasCollectionCenterDto: UpdateAasCollectionCenterDto,
  ) {
    return this.aasCollectionCentersService.update(
      +id,
      updateAasCollectionCenterDto,
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.aasCollectionCentersService.remove(+id);
  }
}
