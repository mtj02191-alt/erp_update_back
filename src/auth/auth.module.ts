import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { JwtGuard } from "./jwt.guard";
import { ConditionalJwtGuard } from "./guards/conditional-jwt.guard";

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [AuthService, JwtGuard, ConditionalJwtGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtGuard, ConditionalJwtGuard],
})
export class AuthModule {}
