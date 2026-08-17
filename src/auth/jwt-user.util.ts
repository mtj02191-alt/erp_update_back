import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthRequestUserService } from "./auth-request-user.service";

export async function attachEnrichedUserToRequest(
  request: Request,
  jwtService: JwtService,
  authRequestUserService: AuthRequestUserService,
  token: string | undefined,
): Promise<void> {
  if (!token) return;

  const payload = await jwtService.verifyAsync(token, {
    secret: process.env.JWT_SECRET || "your-secret-key",
  });
  request["user"] = await authRequestUserService.enrichJwtPayload(payload);
}

export function extractJwtFromCookie(request: Request): string | undefined {
  return request.cookies?.jwt;
}
