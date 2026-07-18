import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgramSubprogram } from "./entities/subprogram.entity";
import { SubprogramsController } from "./subprograms.controller";
import { SubprogramsService } from "./subprograms.service";
import { AuthModule } from "src/auth/auth.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgramSubprogram]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [SubprogramsController],
  providers: [SubprogramsService],
  exports: [SubprogramsService],
})
export class SubprogramsModule {}
