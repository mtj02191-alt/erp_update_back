import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SocialMediaService } from "../../dms/social_media/social_media.service";

@Injectable()
export class SocialPostsBufferCronService {
  private readonly logger = new Logger(SocialPostsBufferCronService.name);

  constructor(private readonly socialMediaService: SocialMediaService) {}

  /**
   * Sync social post statuses from Buffer every 30 minutes (Asia/Karachi).
   */
  @Cron("*/30 * * * *", {
    name: "social-posts-buffer-status-sync",
    timeZone: "Asia/Karachi",
  })
  async handleBufferStatusSync() {
    this.logger.log("Buffer social posts status sync cron started");
    await this.runSync();
  }

  async runSync() {
    try {
      const result = await this.socialMediaService.syncBufferPostStatuses();
      this.logger.log(
        `Buffer sync complete — total: ${result.total}, updated: ${result.updated}, unchanged: ${result.unchanged}, failed: ${result.failed}`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `Buffer social posts sync failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
