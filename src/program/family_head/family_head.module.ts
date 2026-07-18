import { Module } from "@nestjs/common";
import { FamilyHeadService } from "./family_head.service";
import { FamilyHeadController } from "./family_head.controller";

@Module({
  controllers: [FamilyHeadController],
  providers: [FamilyHeadService],
})
export class FamilyHeadModule {}
