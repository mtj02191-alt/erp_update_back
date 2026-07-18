import { Module } from "@nestjs/common";
import { MisService } from "./mis.service";
import { MisController } from "./mis.controller";
import { ProgramSummaryModule } from "./program/program.module";

@Module({
  controllers: [MisController],
  providers: [MisService],
  imports: [ProgramSummaryModule],
})
export class MisModule {}
