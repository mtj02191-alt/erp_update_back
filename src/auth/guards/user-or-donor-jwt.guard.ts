import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthRequestUserService } from "../auth-request-user.service";
import {
  attachEnrichedUserToRequest,
  extractJwtFromCookie,
} from "../jwt-user.util";

/**
 * Allows either:
 * - staff cookie jwt (sets req.user payload)
 * - donor cookie donor_jwt (sets req.donor payload)
 *
 * This guard is ONLY meant for endpoints that explicitly support both identities.
 */
@Injectable()
export class UserOrDonorJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authRequestUserService: AuthRequestUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const cookies: any = (req as any).cookies || {};

    const staffToken = extractJwtFromCookie(req);
    if (staffToken) {
      try {
        await attachEnrichedUserToRequest(
          req,
          this.jwtService,
          this.authRequestUserService,
          staffToken,
        );
        return true;
      } catch {
        // fall through to donor
      }
    }

    const donorToken = cookies.donor_jwt;
    if (donorToken) {
      try {
        const payload = await this.jwtService.verifyAsync(donorToken, {
          secret: process.env.JWT_SECRET || "your-secret-key",
        });
        if (payload?.role !== "donor" || !payload?.donor_id) {
          throw new UnauthorizedException("Invalid donor token");
        }
        (req as any).donor = payload;
        return true;
      } catch {
        throw new UnauthorizedException("Invalid donor token");
      }
    }

    throw new UnauthorizedException("No token provided");
  }
}
