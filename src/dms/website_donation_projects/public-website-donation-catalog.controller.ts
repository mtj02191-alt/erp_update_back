import { Controller, Get, Param } from "@nestjs/common";
import { WebsiteDonationProjectsService } from "./website-donation-projects.service";

@Controller("donations/public")
export class PublicWebsiteDonationCatalogController {
  constructor(
    private readonly service: WebsiteDonationProjectsService,
  ) {}

  @Get("website-projects")
  async findPublicCatalog() {
    const data = await this.service.findPublicCatalog();
    return { success: true, data };
  }

  @Get("website-projects/:slug/page")
  async findPublicPage(@Param("slug") slug: string) {
    const data = await this.service.findPublicPageBySlug(slug);
    return { success: true, data };
  }
}
