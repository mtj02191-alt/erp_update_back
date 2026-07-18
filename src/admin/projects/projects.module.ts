import { Module } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { DepartmentsModule } from "./departments/departments.module";

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  imports: [DepartmentsModule],
})
export class ProjectsModule {}
