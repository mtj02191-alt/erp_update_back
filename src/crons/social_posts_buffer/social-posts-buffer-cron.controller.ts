import { Controller, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { SocialPostsBufferCronService } from "./social-posts-buffer-cron.service";

@Controller("dms-crons")
export class SocialPostsBufferCronController {
  constructor(
    private readonly socialPostsBufferCronService: SocialPostsBufferCronService,
  ) {}

  /**
   * Manual trigger: POST /dms-crons/sync-social-posts-buffer
   */
  @Post("sync-social-posts-buffer")
  async syncSocialPostsBuffer(@Res() res: Response) {
    try {
      const result = await this.socialPostsBufferCronService.runSync();
      return res.status(200).json({
        success: true,
        message: `Buffer sync complete — Total: ${result.total}, Updated: ${result.updated}, Unchanged: ${result.unchanged}, Failed: ${result.failed}`,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: `Buffer sync failed: ${error.message}`,
      });
    }
  }
}
