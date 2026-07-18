import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DonorModule } from "src/dms/donor/donor.module";
import { DonorAuthController } from "./donor-auth.controller";
import { DonorAuthService } from "./donor-auth.service";

@Module({
  imports: [
    DonorModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [DonorAuthController],
  providers: [DonorAuthService],
  exports: [DonorAuthService],
})
export class DonorAuthModule {}
