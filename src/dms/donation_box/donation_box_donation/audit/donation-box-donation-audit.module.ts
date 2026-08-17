import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonationBoxDonationAuditLog } from "./entities/donation-box-donation-audit-log.entity";
import { DonationBoxDonationAuditService } from "./donation-box-donation-audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([DonationBoxDonationAuditLog])],
  providers: [DonationBoxDonationAuditService],
  exports: [DonationBoxDonationAuditService],
})
export class DonationBoxDonationAuditModule {}
