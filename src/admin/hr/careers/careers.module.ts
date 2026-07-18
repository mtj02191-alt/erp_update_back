import { Module } from "@nestjs/common";
import { CareersService } from "./careers.service";
import { CareersController } from "./careers.controller";
import { JobsModule } from "./jobs/jobs.module";
import { ApplicationsModule } from "./applications/applications.module";

@Module({
  controllers: [CareersController],
  providers: [CareersService],
  imports: [JobsModule, ApplicationsModule],
})
export class CareersModule {}
