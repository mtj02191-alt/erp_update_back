import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonationAuditLog } from "./entities/donation-audit-log.entity";
import { DonationAuditService } from "./donation-audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([DonationAuditLog])],
  providers: [DonationAuditService],
  exports: [DonationAuditService],
})
export class DonationAuditModule {}
