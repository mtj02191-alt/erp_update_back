import { Module } from "@nestjs/common";
import { TargetsService } from "./targets.service";
import { TargetsController } from "./targets.controller";
import { Target } from "./entities/target.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/users/user.entity";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([Target, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [TargetsController],
  providers: [TargetsService],
})
export class TargetsModule {}
