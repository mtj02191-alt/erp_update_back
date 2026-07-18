import { Controller, Get, Param, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { CampaignsService } from "./campaigns.service";

@Controller("public/campaigns")
export class PublicCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const result = await this.campaignsService.getPublicActive();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Active campaigns retrieved",
        data: result,
      });
    } catch (error) {
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
      const result = await this.campaignsService.getPublicBySlug(slug);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Campaign retrieved",
        data: result,
      });
    } catch (error) {
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
