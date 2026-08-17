import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ReceiptTemplatesService } from "./receipt_templates.service";
import { ReceiptTemplatesController } from "./receipt_templates.controller";
import { ReceiptTemplate } from "./entities/receipt_template.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceiptTemplate]),
    PermissionsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [ReceiptTemplatesController],
  providers: [ReceiptTemplatesService],
  exports: [ReceiptTemplatesService],
})
export class ReceiptTemplatesModule {}
