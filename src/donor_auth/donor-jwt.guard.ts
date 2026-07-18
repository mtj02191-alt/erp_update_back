import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { DonorAuthService } from "./donor-auth.service";

@Injectable()
export class DonorJwtGuard implements CanActivate {
  constructor(private readonly donorAuth: DonorAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = (req as any)?.cookies?.donor_jwt;
    if (!token) throw new UnauthorizedException("No donor token provided");
    const donor = await this.donorAuth.validateToken(token);
    (req as any).donor = donor;
    return true;
  }
}
