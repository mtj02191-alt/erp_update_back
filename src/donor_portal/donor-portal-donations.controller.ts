import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Res,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Response, Request } from "express";
import { DonorJwtGuard } from "src/donor_auth/donor-jwt.guard";
import { DonorPortalDonationsService } from "./donor-portal-donations.service";

@Controller("donor-portal/donations")
@UseGuards(DonorJwtGuard)
export class DonorPortalDonationsController {
  constructor(private readonly service: DonorPortalDonationsService) {}

  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const donor = (req as any).donor;
    const data = await this.service.listForDonor(donor.id);
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Donor donations retrieved",
      data,
    });
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const donor = (req as any).donor;
    const data = await this.service.getForDonor(donor.id, Number(id));
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Donor donation retrieved",
      data,
    });
  }

  @Get(":id/tracking")
  async tracking(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const donor = (req as any).donor;
    const data = await this.service.getTrackingForDonation(
      donor.id,
      Number(id),
    );
    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Donation tracking retrieved",
      data,
    });
  }
}
