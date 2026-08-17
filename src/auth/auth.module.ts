import { Global, Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { JwtGuard } from "./jwt.guard";
import { ConditionalJwtGuard } from "./guards/conditional-jwt.guard";
import { AuthRequestUserService } from "./auth-request-user.service";
import { UserOrDonorJwtGuard } from "./guards/user-or-donor-jwt.guard";

@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
    PermissionsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [
    AuthService,
    AuthRequestUserService,
    JwtGuard,
    ConditionalJwtGuard,
    UserOrDonorJwtGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    AuthRequestUserService,
    JwtGuard,
    ConditionalJwtGuard,
    UserOrDonorJwtGuard,
    JwtModule,
  ],
})
export class AuthModule {}
