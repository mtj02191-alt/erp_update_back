import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  NotFoundException,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import * as QRCode from "qrcode";
import { QrCodeService } from "./qr_code.service";
import { CreateQrCodeDto } from "./dto/create-qr_code.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
// import { RequiredPermissions } from '../permissions';

@Controller("qr-codes")
export class QrCodeController {
  constructor(private readonly service: QrCodeService) {}

  // In production, protect this with JWT + admin permission
  @Post()
  @UseGuards(JwtGuard, PermissionsGuard)
  // @RequiredPermissions(['fund_raising.donations.create', 'super_admin', 'fund_raising_manager'])
  async create(@Body() dto: CreateQrCodeDto) {
    try {
      const result = await this.service.create(dto);
      return {
        success: true,
        message: "QR code created successfully",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to create QR code",
        data: null,
      };
    }
  }

  @Get(":id")
  @UseGuards(JwtGuard, PermissionsGuard)
  // @RequiredPermissions(['fund_raising.donations.view', 'super_admin', 'fund_raising_manager'])
  async getOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const qr = await this.service.findOne(Number(id));
      if (!qr) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: "QR code not found",
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "QR code retrieved successfully",
        data: {
          id: qr.id,
          targetUrl: qr.target_url,
          projectId: qr.project_id,
          campaign: qr.campaign,
          label: qr.label,
          isActive: qr.is_active,
          createdAt: qr.created_at,
        },
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to retrieve QR code",
        data: null,
      });
    }
  }

  // Serve QR as PNG image (public endpoint - no auth required for image serving)
  @Get(":id/image")
  async image(@Param("id") id: string, @Res() res: Response) {
    try {
      const qr = await this.service.findOne(Number(id));
      if (!qr || !qr.is_active) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send("QR code not found or inactive");
      }

      // Cache: browsers/CDN can cache this (change if you need instant disable)
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day

      const buffer = await QRCode.toBuffer(qr.target_url, {
        type: "png",
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      return res.send(buffer);
    } catch (error: any) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send("Failed to generate QR image");
    }
  }

  // OPTIONAL: Serve SVG for super-sharp printing
  @Get(":id/svg")
  async svg(@Param("id") id: string, @Res() res: Response) {
    try {
      const qr = await this.service.findOne(Number(id));
      if (!qr || !qr.is_active) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .send("QR code not found or inactive");
      }

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const svg = await QRCode.toString(qr.target_url, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: "M",
      });

      return res.send(svg);
    } catch (error: any) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send("Failed to generate QR SVG");
    }
  }
}
