import { Controller, Get, Param, Query, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { AppealsService } from "./appeals.service";

@Controller("public/appeals")
export class PublicAppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const result = await this.appealsService.getPublicActive();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Active appeals retrieved",
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get("featured")
  async getFeatured(@Res() res: Response) {
    try {
      const result = await this.appealsService.getPublicFeatured();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Featured appeal retrieved",
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get("urgent/header")
  async getUrgentHeader(@Query("limit") limit: string, @Res() res: Response) {
    try {
      const take = limit ? Math.min(20, Math.max(1, +limit)) : 5;
      const result = await this.appealsService.getPublicUrgentHeader(take);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Urgent appeals for header",
        data: result,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
      });
    }
  }

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string, @Res() res: Response) {
    try {
      const result = await this.appealsService.getPublicBySlug(slug);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Appeal retrieved",
        data: result,
      });
    } catch (error: any) {
      const status = error.message?.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
