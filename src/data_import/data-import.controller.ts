import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { ConditionalJwtGuard } from "../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { DataImportService } from "./data-import.service";

@Controller("data-import")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Get("entities")
  async listEntities(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Supported import entities",
      data: this.dataImportService.listEntities(),
    });
  }

  @Get(":entityName/template")
  async getTemplate(@Param("entityName") entityName: string, @Res() res: Response) {
    try {
      const template = this.dataImportService.getTemplate(entityName);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Import template",
        data: template,
      });
    } catch (error: any) {
      const status =
        error.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post(":entityName")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importFile(
    @Param("entityName") entityName: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const yearRaw = req?.body?.year;
      const year =
        yearRaw != null && String(yearRaw).trim() !== ""
          ? Number(String(yearRaw).trim())
          : undefined;
      const result = await this.dataImportService.importCsvFile(
        entityName,
        file,
        req?.user ?? null,
        { year },
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Import completed: ${result.success_count} succeeded, ${result.failed_count} failed`,
        data: result,
      });
    } catch (error: any) {
      const status =
        error.status === 404
          ? HttpStatus.NOT_FOUND
          : error.status === 403
            ? HttpStatus.FORBIDDEN
            : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
