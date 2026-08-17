import {
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { PermissionsService } from "../permissions.service";
import { User, UserRole } from "../../users/user.entity";
import {
  ApplyScopeOptions,
  DataScopeType,
  ResolvedDataScope,
} from "./data-scope.types";

@Injectable()
export class DataScopeService {
  private readonly logger = new Logger(DataScopeService.name);

  constructor(
    private readonly permissionsService: PermissionsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  isSuperAdmin(
    userRole: string | undefined,
    permissions: Record<string, any>,
  ): boolean {
    if (userRole === UserRole.SUPER_ADMIN) return true;
    if (permissions?.super_admin === true) return true;
    return false;
  }

  /**
   * Read per-module data scope from permissions JSON.
   * Defaults to `self` when list access exists but scope is unset.
   */
  readModuleScope(
    permissions: Record<string, any>,
    department: string,
    module: string,
  ): DataScopeType {
    const modulePerms = permissions?.[department]?.[module];
    if (!modulePerms || typeof modulePerms !== "object") {
      return "self";
    }
    if (modulePerms.view_all === true) {
      return "org";
    }
    const scope = modulePerms.scope;
    if (
      scope === "self" ||
      scope === "team" ||
      scope === "department" ||
      scope === "org"
    ) {
      return scope;
    }
    return "self";
  }

  async getDirectReportIds(managerId: number): Promise<number[]> {
    const reports = await this.userRepository.find({
      where: { manager_id: managerId, is_archived: false },
      select: ["id"],
    });
    return reports.map((u) => u.id);
  }

  async getDepartmentUserIds(department: string): Promise<number[]> {
    const users = await this.userRepository.find({
      where: { department: department as any, is_archived: false },
      select: ["id"],
    });
    return users.map((u) => u.id);
  }

  async resolveScope(
    userId: number | null | undefined,
    userRole: string | undefined,
    userDepartment: string | undefined,
    permissionDepartment: string,
    module: string,
  ): Promise<ResolvedDataScope> {
    const numericUserId = Number(userId);
    if (!numericUserId || numericUserId === -1) {
      return {
        bypass: true,
        type: "org",
        allowedUserIds: null,
        userId: numericUserId || -1,
        userDepartment,
      };
    }

    const permissions =
      await this.permissionsService.getUserPermissions(numericUserId);

    if (this.isSuperAdmin(userRole, permissions)) {
      return {
        bypass: true,
        type: "org",
        allowedUserIds: null,
        userId: numericUserId,
        userDepartment,
      };
    }

    const scopeType = this.readModuleScope(
      permissions,
      permissionDepartment,
      module,
    );

    if (scopeType === "org") {
      return {
        bypass: false,
        type: "org",
        allowedUserIds: null,
        userId: numericUserId,
        userDepartment,
      };
    }

    if (scopeType === "department") {
      const dept = userDepartment || permissionDepartment;
      const deptUserIds = await this.getDepartmentUserIds(dept);
      return {
        bypass: false,
        type: "department",
        allowedUserIds: deptUserIds.length ? deptUserIds : [numericUserId],
        userId: numericUserId,
        userDepartment: dept,
      };
    }

    if (scopeType === "team") {
      const reportIds = await this.getDirectReportIds(numericUserId);
      const allowed = Array.from(new Set([numericUserId, ...reportIds]));
      return {
        bypass: false,
        type: "team",
        allowedUserIds: allowed,
        userId: numericUserId,
        userDepartment,
      };
    }

    return {
      bypass: false,
      type: "self",
      allowedUserIds: [numericUserId],
      userId: numericUserId,
      userDepartment,
    };
  }

  /**
   * Merge two scopes (e.g. online + offline donations). Widest type wins; user id sets are unioned.
   */
  mergeScopes(a: ResolvedDataScope, b: ResolvedDataScope): ResolvedDataScope {
    if (a.bypass || b.bypass) {
      return {
        bypass: true,
        type: "org",
        allowedUserIds: null,
        userId: a.userId,
        userDepartment: a.userDepartment ?? b.userDepartment,
      };
    }

    const rank: Record<DataScopeType, number> = {
      self: 1,
      team: 2,
      department: 3,
      org: 4,
    };

    const wider = rank[a.type] >= rank[b.type] ? a : b;
    const narrower = wider === a ? b : a;

    if (wider.type === "org" || wider.allowedUserIds === null) {
      return wider;
    }

    return {
      ...wider,
      allowedUserIds: Array.from(
        new Set([
          ...(wider.allowedUserIds || []),
          ...(narrower.allowedUserIds || []),
        ]),
      ),
    };
  }

  applyToQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    scope: ResolvedDataScope,
    options?: ApplyScopeOptions,
  ): void {
    if (scope.bypass || scope.type === "org" || !scope.allowedUserIds?.length) {
      return;
    }

    const ids = scope.allowedUserIds;
    const createdCol = `${alias}.created_by`;

    if (options?.assignedToColumn) {
      query.andWhere(
        `(${createdCol} IN (:...dataScopeUserIds) OR ${options.assignedToColumn} IN (:...dataScopeUserIds))`,
        { dataScopeUserIds: ids },
      );
      return;
    }

    query.andWhere(`${createdCol} IN (:...dataScopeUserIds)`, {
      dataScopeUserIds: ids,
    });
  }

  getRecordOwnerIds(
    record: {
      created_by?: { id?: number } | number | null;
      assigned_to?: { id?: number } | number | null;
    },
    options?: { useAssignedTo?: boolean },
  ): number[] {
    const ids: number[] = [];
    const created = record.created_by;
    if (created != null) {
      const id = typeof created === "object" ? created.id : created;
      if (id != null) ids.push(Number(id));
    }
    if (options?.useAssignedTo && record.assigned_to != null) {
      const id =
        typeof record.assigned_to === "object"
          ? record.assigned_to.id
          : record.assigned_to;
      if (id != null) ids.push(Number(id));
    }
    return ids;
  }

  assertRecordAccess(
    scope: ResolvedDataScope,
    record: {
      created_by?: { id?: number } | number | null;
      assigned_to?: { id?: number } | number | null;
    },
    options?: { useAssignedTo?: boolean },
  ): void {
    if (scope.bypass || scope.type === "org" || !scope.allowedUserIds?.length) {
      return;
    }

    const ownerIds = this.getRecordOwnerIds(record, options);
    if (ownerIds.length === 0) {
      throw new ForbiddenException("You do not have access to this record");
    }

    const allowed = ownerIds.some((id) => scope.allowedUserIds!.includes(id));
    if (!allowed) {
      throw new ForbiddenException("You do not have access to this record");
    }
  }
}
