import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ResumeCollection } from "./entities/resume_collection.entity";
import { ResumeCollectionService } from "./resume_collection.service";
import { ResumeCollectionController } from "./resume_collection.controller";
import { ResumeS3Service } from "./resume-s3.service";
import { ResumeAiExtractionService } from "./resume-ai-extraction.service";
import { PermissionsModule } from "../../../permissions/permissions.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeCollection]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ResumeCollectionController],
  providers: [
    ResumeCollectionService,
    ResumeS3Service,
    ResumeAiExtractionService,
  ],
  exports: [ResumeCollectionService],
})
export class ResumeCollectionModule {}
