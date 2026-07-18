import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SummaryService } from "./summary.service";
import { SummaryController } from "./summary.controller";
import { MisModule } from "./mis/mis.module";

@Module({
  controllers: [SummaryController],
  providers: [SummaryService],
  imports: [TypeOrmModule.forFeature(), MisModule],
})
export class SummaryModule {}
