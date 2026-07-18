import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Get,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";

interface LoginDto {
  email: string;
  password: string;
}

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log("Login attempt for:", loginDto.email);

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    const result = await this.authService.login(user);
    console.log("Login successful, setting cookies...");

    // Set JWT in HTTP-only cookie (no domain sharing - separate cookies per domain)
    const jwtCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true for HTTPS, false for HTTP
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
        | "none"
        | "lax", // 'none' for cross-origin HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
      // No domain set = cookie only works for the exact domain that set it
    };

    console.log("Setting JWT cookie with options:", jwtCookieOptions);
    response.cookie("jwt", result.token, jwtCookieOptions);

    console.log("Returning response with user data and permissions");
    return {
      message: "Login successful",
      token: result.token, // Include token for WebSocket connection
      user: result.user, // Include user data in response
      permissions: result.permissions, // Include permissions in response
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    console.log("Logout request received, clearing cookies...");

    // Clear JWT cookie (no domain sharing - separate cookies per domain)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true for HTTPS, false for HTTP
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
        | "none"
        | "lax", // 'none' for cross-origin HTTPS
      path: "/",
      // No domain set = cookie only works for the exact domain that set it
    };
    response.clearCookie("jwt", cookieOptions);

    console.log("Cookies cleared");
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(JwtGuard)
  async getProfile(@Req() request: Request) {
    console.log("Profile request received, cookies:", request.cookies);
    const token = request.cookies?.jwt;
    const user = await this.authService.validateToken(token);

    // Extract permissions from the user relation
    const permissions = user.permissions?.permissions || {};

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        dob: user.dob,
        address: user.address,
        cnic: user.cnic,
        gender: user.gender,
        joining_date: user.joining_date,
        emergency_contact: user.emergency_contact,
        blood_group: user.blood_group,
      },
      permissions,
    };
  }
}
