import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonorAuditLog } from "./entities/donor-audit-log.entity";
import { DonorAuditService } from "./donor-audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([DonorAuditLog])],
  providers: [DonorAuditService],
  exports: [DonorAuditService],
})
export class DonorAuditModule {}
