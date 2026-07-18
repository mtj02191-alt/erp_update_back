import { Module } from "@nestjs/common";
import { AasCollectionCentersService } from "./aas_collection_centers.service";
import { AasCollectionCentersController } from "./aas_collection_centers.controller";

@Module({
  controllers: [AasCollectionCentersController],
  providers: [AasCollectionCentersService],
})
export class AasCollectionCentersModule {}
