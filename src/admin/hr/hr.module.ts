import { Module } from "@nestjs/common";
import { HrService } from "./hr.service";
import { HrController } from "./hr.controller";
import { CareersModule } from "./careers/careers.module";

@Module({
  controllers: [HrController],
  providers: [HrService],
  imports: [CareersModule],
})
export class HrModule {}
