import { Module } from "@nestjs/common";
import { SubProjectsService } from "./sub_projects.service";
import { SubProjectsController } from "./sub_projects.controller";

@Module({
  controllers: [SubProjectsController],
  providers: [SubProjectsService],
})
export class SubProjectsModule {}
