import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { Application } from "./entities/application.entity";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
