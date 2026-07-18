import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    return await this.usersService.validateUser(email, password);
  }

  async login(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    // We don't need to return the token as it will be set in cookie by the controller
    const token = await this.jwtService.signAsync(payload);

    // Extract permissions from the user relation
    const permissions = user?.permissions?.permissions || {};

    return {
      token, // This will be set as cookie by controller
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
        is_archived: user?.is_archived,
      },
      permissions, // Include permissions in login response
    };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findByEmail(payload.email);
      if (!user || !user.isActive || user?.is_archived) {
        throw new UnauthorizedException(
          "User not found or inactive or archived",
        );
      }
      return user;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
