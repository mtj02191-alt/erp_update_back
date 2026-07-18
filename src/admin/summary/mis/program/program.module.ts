import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgramService } from "./program.service";
import { ProgramController } from "./program.controller";
import { ProgramEntity } from "./entities/program.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ProgramEntity])],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramSummaryModule {}
