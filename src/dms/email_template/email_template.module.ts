import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { EmailTemplateService } from "./email_template.service";
import { EmailTemplateController } from "./email_template.controller";
import { PublicResendWebhookController } from "./public-resend-webhook.controller";
import { EmailTemplate } from "./entities/email_template.entity";
import { CommunicationLog } from "./entities/communication-log.entity";
import { CommunicationBatch } from "./entities/communication-batch.entity";
import { DonorModule } from "../donor/donor.module";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Appeal } from "../appeals/entities/appeal.entity";
import { Event } from "../events/entities/event.entity";
import { Donor } from "../donor/entities/donor.entity";
import { DonorInteraction } from "../donor_relationship/entities/donor-interaction.entity";
import { EmailModule } from "../../email/email.module";
import { JwtModule } from "@nestjs/jwt";
import { WhatsAppService } from "../../utils/services/whatsapp.service";

@Module({
  imports: [
    ConfigModule,
    DonorModule,
    TypeOrmModule.forFeature([
      EmailTemplate,
      CommunicationLog,
      CommunicationBatch,
      Campaign,
      Appeal,
      Event,
      Donor,
      DonorInteraction,
    ]),
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [EmailTemplateController, PublicResendWebhookController],
  providers: [EmailTemplateService, WhatsAppService],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
