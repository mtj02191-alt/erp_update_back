import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { WebsiteHomeHeroSlide } from "./entities/website-home-hero-slide.entity";
import { WebsiteHomeHeroService } from "./website-home-hero.service";
import { WebsiteHomeHeroController } from "./website-home-hero.controller";
import { PublicWebsiteHomeHeroController } from "./public-website-home-hero.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([WebsiteHomeHeroSlide]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [WebsiteHomeHeroController, PublicWebsiteHomeHeroController],
  providers: [WebsiteHomeHeroService],
  exports: [WebsiteHomeHeroService],
})
export class WebsiteHomeHeroModule {}
