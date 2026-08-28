import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { JwtGuard } from "../../auth/jwt.guard";
import { WebsiteHomeHeroService } from "./website-home-hero.service";
import { CreateWebsiteHomeHeroSlideDto } from "./dto/create-website-home-hero-slide.dto";
import { UpdateWebsiteHomeHeroSlideDto } from "./dto/update-website-home-hero-slide.dto";
import { S3StorageService } from "../../utils/storage/s3-storage.service";

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller("website-home-hero")
@UseGuards(JwtGuard)
export class WebsiteHomeHeroController {
  constructor(
    private readonly service: WebsiteHomeHeroService,
    private readonly s3Storage: S3StorageService,
  ) {}

  /** Upload hero slide image to S3 (donations/website-home-hero/...). */
  @Post("upload/image")
  @UseInterceptors(FileInterceptor("file", imageUploadOptions))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        throw new BadRequestException("File is required");
      }
      const result = await this.s3Storage.uploadWebsiteHomeHeroImage(file);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Image uploaded successfully",
        data: result,
      });
    } catch (error: any) {
      const status =
        error.status || error.statusCode || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post()
  async create(@Body() dto: CreateWebsiteHomeHeroSlideDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  @Get()
  async findAll(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
  ) {
    const result = await this.service.findAll({ page, pageSize, search });
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.service.findOne(+id);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWebsiteHomeHeroSlideDto,
  ) {
    const data = await this.service.update(+id, dto);
    return { success: true, data };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.service.remove(+id);
    return { success: true, message: "Home hero slide archived" };
  }
}
