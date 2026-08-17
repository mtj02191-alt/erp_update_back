import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DmsTodosService } from "./dms-todos.service";
import { DmsTodosController } from "./dms-todos.controller";
import { DmsTodo } from "./entities/dms-todo.entity";
import { DonationBox } from "../donation_box/entities/donation-box.entity";
import { User } from "../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([DmsTodo, DonationBox, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [DmsTodosController],
  providers: [DmsTodosService],
  exports: [DmsTodosService],
})
export class DmsTodosModule {}
