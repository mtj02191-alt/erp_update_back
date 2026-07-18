import { Module } from "@nestjs/common";
import { BenificiaryService } from "./benificiary.service";
import { BenificiaryController } from "./benificiary.controller";

@Module({
  controllers: [BenificiaryController],
  providers: [BenificiaryService],
})
export class BenificiaryModule {}
