import { Module } from "@nestjs/common";
import { HrService } from "./hr.service";
import { HrController } from "./hr.controller";
import { CareersModule } from "./careers/careers.module";
import { ResumeCollectionModule } from "./resume_collection/resume_collection.module";

@Module({
  controllers: [HrController],
  providers: [HrService],
  imports: [CareersModule, ResumeCollectionModule],
})
export class HrModule {}
