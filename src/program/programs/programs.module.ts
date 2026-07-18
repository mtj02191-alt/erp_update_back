import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgramEntity } from "./entities/program.entity";
import { ProgramsController } from "./programs.controller";
import { ProgramsService } from "./programs.service";
import { AuthModule } from "src/auth/auth.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgramEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
