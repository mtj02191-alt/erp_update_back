import { Module } from "@nestjs/common";
import { MeezanService } from "./meezan.service";
import { MeezanController } from "./meezan.controller";

@Module({
  controllers: [MeezanController],
  providers: [MeezanService],
})
export class MeezanModule {}
