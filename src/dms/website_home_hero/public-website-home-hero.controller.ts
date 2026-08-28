import { Controller, Get } from "@nestjs/common";
import { WebsiteHomeHeroService } from "./website-home-hero.service";

@Controller("donations/public")
export class PublicWebsiteHomeHeroController {
  constructor(private readonly service: WebsiteHomeHeroService) {}

  @Get("home-hero-slides")
  async findPublicSlides() {
    const data = await this.service.findPublicSlides();
    return { success: true, data };
  }
}
