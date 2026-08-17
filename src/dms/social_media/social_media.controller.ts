import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  HttpStatus,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { SocialMediaService } from "./social_media.service";
import { SocialPostAiService } from "./social-post-ai.service";
import { CreateSocialPostDto } from "./dto/create-social-post.dto";
import { UpdateSocialPostDto } from "./dto/update-social-post.dto";
import { GenerateSocialPostAiDto } from "./dto/generate-social-post-ai.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { S3StorageService } from "../../utils/storage/s3-storage.service";

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller("social-posts")
@UseGuards(JwtGuard, PermissionsGuard)
export class SocialMediaController {
  constructor(
    private readonly socialMediaService: SocialMediaService,
    private readonly socialPostAiService: SocialPostAiService,
    private readonly s3Storage: S3StorageService,
  ) {}

  @Post("search")
  @RequiredPermissions([
    "fund_raising.social_posts.list_view",
    "super_admin",
    "fund_raising_manager",
  ])
  async search(@Body() payload: Record<string, any>, @Res() res: Response) {
    try {
      const result = await this.socialMediaService.search(payload);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Social posts fetched",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Failed to fetch social posts",
        data: [],
        pagination: null,
      });
    }
  }

  @Get("buffer/channels")
  @RequiredPermissions([
    "fund_raising.social_posts.create",
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async bufferChannels(@Res() res: Response) {
    try {
      const channels = await this.socialMediaService.listBufferChannels();
      return res.status(HttpStatus.OK).json({
        success: true,
        data: channels,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to load Buffer channels",
        data: [],
      });
    }
  }

  @Post("ai/generate-text")
  @RequiredPermissions([
    "fund_raising.social_posts.create",
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateText(
    @Body() dto: GenerateSocialPostAiDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.socialPostAiService.generatePostText(dto);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "AI text generation failed",
        data: null,
      });
    }
  }

  @Post("ai/generate-image")
  @RequiredPermissions([
    "fund_raising.social_posts.create",
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateImage(
    @Body() dto: GenerateSocialPostAiDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.socialPostAiService.generatePostImage(dto);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "AI image generation failed",
        data: null,
      });
    }
  }

  @Post("upload/image")
  @RequiredPermissions([
    "fund_raising.social_posts.create",
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  @UseInterceptors(FileInterceptor("file", imageUploadOptions))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      const result = await this.s3Storage.uploadImage(
        "social_media",
        file,
        ["uploads"],
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Image uploaded",
        data: result,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
        data: null,
      });
    }
  }

  @Post()
  @RequiredPermissions([
    "fund_raising.social_posts.create",
    "super_admin",
    "fund_raising_manager",
  ])
  async create(@Body() dto: CreateSocialPostDto, @Res() res: Response) {
    try {
      const data = await this.socialMediaService.create(dto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Social post created",
        data,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to create social post",
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "fund_raising.social_posts.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.socialMediaService.findOne(+id);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error: any) {
      const status =
        error?.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSocialPostDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.socialMediaService.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Social post updated",
        data,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
        data: null,
      });
    }
  }

  @Post(":id/sync-buffer-status")
  @RequiredPermissions([
    "fund_raising.social_posts.view",
    "fund_raising.social_posts.list_view",
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async syncBufferStatus(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.socialMediaService.syncBufferPostStatus(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to sync status from Buffer",
        data: null,
      });
    }
  }

  @Post(":id/publish")
  @RequiredPermissions([
    "fund_raising.social_posts.update",
    "super_admin",
    "fund_raising_manager",
  ])
  async publish(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.socialMediaService.publishToBuffer(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Post sent to Buffer",
        data,
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to publish to Buffer",
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "fund_raising.social_posts.delete",
    "super_admin",
    "fund_raising_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.socialMediaService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Social post archived",
      });
    } catch (error: any) {
      const status = error?.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message,
      });
    }
  }
}
