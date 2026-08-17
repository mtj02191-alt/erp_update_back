import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonationBoxAuditLog } from "./entities/donation-box-audit-log.entity";
import { DonationBoxAuditService } from "./donation-box-audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([DonationBoxAuditLog])],
  providers: [DonationBoxAuditService],
  exports: [DonationBoxAuditService],
})
export class DonationBoxAuditModule {}
