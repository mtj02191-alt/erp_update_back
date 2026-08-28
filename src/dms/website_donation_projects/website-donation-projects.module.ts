import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { WebsiteDonationProject } from "./entities/website-donation-project.entity";
import { WebsiteDonationInitiative } from "./entities/website-donation-initiative.entity";
import { WebsiteDonationProjectsService } from "./website-donation-projects.service";
import { WebsiteDonationProjectsController } from "./website-donation-projects.controller";
import { PublicWebsiteDonationCatalogController } from "./public-website-donation-catalog.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebsiteDonationProject,
      WebsiteDonationInitiative,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [
    WebsiteDonationProjectsController,
    PublicWebsiteDonationCatalogController,
  ],
  providers: [WebsiteDonationProjectsService],
  exports: [WebsiteDonationProjectsService],
})
export class WebsiteDonationProjectsModule {}
