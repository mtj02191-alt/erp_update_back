import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DonorService } from "src/dms/donor/donor.service";

@Injectable()
export class DonorAuthService {
  constructor(
    private readonly donorService: DonorService,
    private readonly jwtService: JwtService,
  ) {}

  async validateDonor(email: string, password: string) {
    return this.donorService.validateDonor(email, password);
  }

  async login(donor: any) {
    const payload = {
      donor_id: donor.id,
      email: donor.email,
      role: "donor",
    };
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      donor: {
        id: donor.id,
        email: donor.email,
        name: donor.name || null,
        phone: donor.phone || null,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "your-secret-key",
      });
      if (!payload?.donor_id || payload?.role !== "donor") {
        throw new UnauthorizedException("Invalid donor token");
      }
      const donor = await this.donorService.findOne(Number(payload.donor_id));
      // findOne already strips password
      if (!donor || donor.is_archived || donor.is_active === false) {
        throw new UnauthorizedException("Donor not found or inactive");
      }
      return donor;
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || "Invalid donor token");
    }
  }
}
