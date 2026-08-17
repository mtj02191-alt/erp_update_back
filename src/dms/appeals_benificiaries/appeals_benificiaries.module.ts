import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AppealsBenificiariesService } from "./appeals_benificiaries.service";
import { AppealsBenificiariesController } from "./appeals_benificiaries.controller";
import { AppealsBenificiary } from "./entities/appeals_benificiary.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppealsBenificiary]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [AppealsBenificiariesController],
  providers: [AppealsBenificiariesService],
  exports: [AppealsBenificiariesService],
})
export class AppealsBenificiariesModule {}
