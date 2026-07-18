import { Controller, Get, Param, HttpStatus, Res } from "@nestjs/common";
import { Response } from "express";
import { EventsService } from "./events.service";

@Controller("public/events")
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const result = await this.eventsService.getPublicEvents();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Public events retrieved",
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
      const result = await this.eventsService.getPublicBySlug(slug);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Event retrieved",
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
