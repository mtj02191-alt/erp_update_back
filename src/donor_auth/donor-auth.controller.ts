import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { DonorAuthService } from "./donor-auth.service";
import { DonorJwtGuard } from "./donor-jwt.guard";

interface DonorLoginDto {
  email: string;
  password: string;
}

@Controller("donor-auth")
export class DonorAuthController {
  constructor(private readonly auth: DonorAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: DonorLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const donor = await this.auth.validateDonor(dto.email, dto.password);
    const result = await this.auth.login(donor);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
        | "none"
        | "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    };

    res.cookie("donor_jwt", result.token, cookieOptions);
    return {
      message: "Login successful",
      donor: result.donor,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
        | "none"
        | "lax",
      path: "/",
    };
    res.clearCookie("donor_jwt", cookieOptions);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(DonorJwtGuard)
  async me(@Req() req: Request) {
    const donor = (req as any).donor;
    return {
      donor: {
        id: donor.id,
        email: donor.email,
        name: donor.name || null,
        phone: donor.phone || null,
      },
    };
  }
}
