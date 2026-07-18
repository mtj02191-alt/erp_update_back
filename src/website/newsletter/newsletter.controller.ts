import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import { CreateNewsletterDto } from "./dto/create-newsletter.dto";
import { UpdateNewsletterDto } from "./dto/update-newsletter.dto";

@Controller("website_news_letter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  async create(@Body() createNewsletterDto: CreateNewsletterDto) {
    return await this.newsletterService.create(createNewsletterDto);
  }

  @Get()
  async findAll() {
    return await this.newsletterService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.newsletterService.findOne(+id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateNewsletterDto: UpdateNewsletterDto,
  ) {
    return await this.newsletterService.update(+id, updateNewsletterDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.newsletterService.remove(+id);
    return { message: "Newsletter subscriber deleted successfully" };
  }
}
