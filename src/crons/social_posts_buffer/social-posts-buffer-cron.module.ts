import { Module } from "@nestjs/common";
import { SocialPostsBufferCronService } from "./social-posts-buffer-cron.service";
import { SocialPostsBufferCronController } from "./social-posts-buffer-cron.controller";
import { SocialMediaModule } from "../../dms/social_media/social_media.module";

@Module({
  imports: [SocialMediaModule],
  providers: [SocialPostsBufferCronService],
  controllers: [SocialPostsBufferCronController],
})
export class SocialPostsBufferCronModule {}
