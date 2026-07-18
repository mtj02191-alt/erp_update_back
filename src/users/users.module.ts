import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { User } from "./user.entity";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import { JwtModule } from "@nestjs/jwt";
import { UsersController } from "./user.controller";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PermissionsEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
