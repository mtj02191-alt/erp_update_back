import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { UserGeographicContext } from "../users/user-geographic.types";
import { GeographicScopeService } from "../permissions/geographic-scope/geographic-scope.service";
import { GeographicScopeSummary } from "../permissions/geographic-scope/geographic-scope.types";

export type JwtPayload = {
  id: number;
  email?: string;
  role?: string;
  department?: string;
  [key: string]: unknown;
};

export type AuthenticatedRequestUser = JwtPayload &
  UserGeographicContext & {
    /** Resolved city/region/district/tehsil/route names used for data filtering */
    geographic_scope?: GeographicScopeSummary;
  };

@Injectable()
export class AuthRequestUserService {
  constructor(
    private readonly usersService: UsersService,
    private readonly geographicScopeService: GeographicScopeService,
  ) {}

  /**
   * Merge JWT claims with assignment IDs and resolved geographic vocabulary.
   */
  async enrichJwtPayload(
    payload: JwtPayload | null | undefined,
  ): Promise<AuthenticatedRequestUser | JwtPayload | null | undefined> {
    if (!payload?.id || payload.id === -1) {
      return payload;
    }

    const geographic =
      await this.usersService.getGeographicContextByUserId(Number(payload.id));

    if (!geographic) {
      return payload;
    }

    const userSnapshot = {
      id: Number(payload.id),
      department: payload.department,
      role: payload.role,
      ...geographic,
    };

    const scope = await this.geographicScopeService.resolveForUser(
      Number(payload.id),
      payload.role as string | undefined,
      userSnapshot as any,
    );

    return {
      ...payload,
      ...geographic,
      geographic_scope: this.geographicScopeService.toScopeSummary(scope),
    };
  }
}
