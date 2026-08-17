import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { SocialMediaService } from "./social_media.service";
import { SocialMediaController } from "./social_media.controller";
import { SocialPost } from "./entities/social-post.entity";
import { BufferClient } from "./buffer.client";
import { SocialPostAiService } from "./social-post-ai.service";
import { Appeal } from "../appeals/entities/appeal.entity";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { PermissionsModule } from "src/permissions";
import { S3StorageModule } from "../../utils/storage/s3-storage.module";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SocialPost, Appeal, Campaign]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    S3StorageModule,
  ],
  controllers: [SocialMediaController],
  providers: [SocialMediaService, BufferClient, SocialPostAiService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}
