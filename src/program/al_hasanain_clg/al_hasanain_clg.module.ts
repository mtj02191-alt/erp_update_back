import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AlHasanainClg } from "./entities/al_hasanain_clg.entity";
import { AlHasanainClgService } from "./al_hasanain_clg.service";
import { AlHasanainClgController } from "./al_hasanain_clg.controller";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([AlHasanainClg]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [AlHasanainClgController],
  providers: [AlHasanainClgService],
  exports: [AlHasanainClgService, TypeOrmModule],
})
export class AlHasanainClgModule {}
