import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthRequestUserService } from "../auth-request-user.service";
import {
  attachEnrichedUserToRequest,
  extractJwtFromCookie,
} from "../jwt-user.util";

@Injectable()
export class ConditionalJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authRequestUserService: AuthRequestUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Allow requests from localhost:3000 or donation domain without token
    if (
      request.headers.origin === "http://localhost:3001" ||
      request.headers.origin === "https://donation.mtjfoundation.org" ||
      request.headers.origin === "https://mtjf-site.vercel.app" ||
      request.headers.origin === "https://mtjfoundation.org" ||
      request.headers.origin === "https://www.mtjfoundation.org" ||
      request.headers.origin === "http://18.143.123.75" ||
      request.headers.origin === "https://18.143.123.75" ||
      request.headers.origin === "http://18.143.123.75"
    ) {
      console.log(`Bypassing authentication for ${request.headers.origin}`);
      // Set a default user for public donation requests
      request["user"] = {
        id: -1, // Use -1 to indicate a system/public user
        email: "public@system",
        role: "public_donor",
        department: "system",
        permissions: {
          fund_raising: {
            donations: {
              create: true,
            },
          },
        },
      };
      return true;
    }

    // For all other origins, require JWT token
    const token = extractJwtFromCookie(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      await attachEnrichedUserToRequest(
        request,
        this.jwtService,
        this.authRequestUserService,
        token,
      );
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
