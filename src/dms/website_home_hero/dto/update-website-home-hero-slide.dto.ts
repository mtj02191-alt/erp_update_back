import { PartialType } from "@nestjs/mapped-types";
import { CreateWebsiteHomeHeroSlideDto } from "./create-website-home-hero-slide.dto";

export class UpdateWebsiteHomeHeroSlideDto extends PartialType(
  CreateWebsiteHomeHeroSlideDto,
) {}
