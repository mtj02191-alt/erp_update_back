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
  ApplyUserIdsFilterOptions,
  DataScopeType,
  ResolveListScopeInput,
  ResolvedDataScope,
  TeamFilterInput,
  TeamFilterMode,
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
    const mid = Number(managerId);
    if (!mid) return [];

    const rows = await this.userRepository
      .createQueryBuilder("u")
      .select("u.id", "id")
      .where("u.is_archived = false")
      .andWhere(
        `(u.manager_id = :mid OR EXISTS (
          SELECT 1 FROM user_managers um
          WHERE um.user_id = u.id AND um.manager_id = :mid
        ))`,
        { mid },
      )
      .getRawMany();

    return Array.from(
      new Set(rows.map((r) => Number(r.id)).filter((id) => id > 0)),
    );
  }

  /**
   * All reportees under a manager at every depth (BFS, cycle-safe).
   * Does not include the manager themself.
   * Uses user_managers join (+ legacy manager_id for pre-backfill rows).
   */
  async getAllReportIds(managerId: number): Promise<number[]> {
    const root = Number(managerId);
    if (!root) return [];

    const all: number[] = [];
    const seen = new Set<number>([root]);
    let frontier = [root];

    while (frontier.length) {
      const rows = await this.userRepository
        .createQueryBuilder("u")
        .select("u.id", "id")
        .where("u.is_archived = false")
        .andWhere(
          `(u.manager_id IN (:...ids) OR EXISTS (
            SELECT 1 FROM user_managers um
            WHERE um.user_id = u.id AND um.manager_id IN (:...ids)
          ))`,
          { ids: frontier },
        )
        .getRawMany();

      frontier = [];
      for (const row of rows) {
        const id = Number(row.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        all.push(id);
        frontier.push(id);
      }
    }

    return all;
  }

  /** Reporting tree only (no self). Shared by team listings across modules. */
  async getReportingTeamIds(managerId: number): Promise<number[]> {
    const mid = Number(managerId);
    if (!mid) return [];
    return (await this.getAllReportIds(mid)).filter(
      (id) => id > 0 && id !== mid,
    );
  }

  async getDepartmentUserIds(department: string): Promise<number[]> {
    const users = await this.userRepository.find({
      where: { department: department as any, is_archived: false },
      select: ["id"],
    });
    return users.map((u) => u.id);
  }

  parseTeamFilter(
    modeRaw?: string | null,
    userIdRaw?: string | number | null,
  ): TeamFilterInput | null {
    const mode = String(modeRaw || "")
      .trim()
      .toLowerCase() as TeamFilterMode | "";
    if (
      !mode ||
      (mode !== "all" &&
        mode !== "me" &&
        mode !== "direct" &&
        mode !== "entire" &&
        mode !== "user")
    ) {
      return null;
    }
    const userId =
      userIdRaw != null && String(userIdRaw).trim() !== ""
        ? Number(userIdRaw)
        : null;
    return {
      mode,
      userId: Number.isFinite(userId) && (userId as number) > 0 ? userId : null,
    };
  }

  /**
   * Narrow a resolved access-scope ceiling with a list Team filter.
   * Never expands beyond allowedUserIds (when set).
   */
  async narrowScopeWithTeamFilter(
    scope: ResolvedDataScope,
    filter: TeamFilterInput | null | undefined,
  ): Promise<ResolvedDataScope> {
    if (!filter?.mode || filter.mode === "all") {
      return scope;
    }

    const selfId = Number(scope.userId);
    if (!selfId || selfId < 1) return scope;

    let candidateIds: number[] = [];
    if (filter.mode === "me") {
      candidateIds = [selfId];
    } else if (filter.mode === "direct") {
      candidateIds = await this.getDirectReportIds(selfId);
    } else if (filter.mode === "entire") {
      candidateIds = await this.getAllReportIds(selfId);
    } else if (filter.mode === "user") {
      const pick = Number(filter.userId);
      if (!pick) {
        return { ...scope, bypass: false, allowedUserIds: [] };
      }
      const tree = new Set<number>([
        selfId,
        ...(await this.getAllReportIds(selfId)),
      ]);
      // Person picker is limited to self + reporting tree
      candidateIds = tree.has(pick) ? [pick] : [];
    }

    const intersect = (ids: number[]): number[] => {
      if (scope.bypass || scope.type === "org" || scope.allowedUserIds == null) {
        return ids;
      }
      const allowed = new Set(scope.allowedUserIds.map(Number));
      return ids.filter((id) => allowed.has(id));
    };

    const narrowed = intersect(candidateIds);
    return {
      ...scope,
      bypass: false,
      type: scope.type === "org" || scope.bypass ? "team" : scope.type,
      allowedUserIds: narrowed,
    };
  }

  /**
   * One-shot: Access Scope + optional Team filter.
   * Prefer this in every list endpoint that supports team_filter.
   */
  async resolveListScope(
    input: ResolveListScopeInput,
  ): Promise<ResolvedDataScope> {
    let scope = await this.resolveScope(
      input.userId,
      input.userRole,
      input.userDepartment,
      input.permissionDepartment,
      input.module,
    );
    const teamFilter = this.parseTeamFilter(
      input.teamFilter,
      input.teamFilterUserId,
    );
    if (teamFilter) {
      scope = await this.narrowScopeWithTeamFilter(scope, teamFilter);
    }
    return scope;
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
      // Full reporting tree (all depths) + self
      const reportIds = await this.getAllReportIds(numericUserId);
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
    if (scope.bypass || scope.type === "org" || scope.allowedUserIds == null) {
      return;
    }

    const columns = options?.assignedToColumn
      ? [`${alias}.created_by`, options.assignedToColumn]
      : [`${alias}.created_by`];

    this.applyUserIdsFilter(query, scope.allowedUserIds || [], { columns });
  }

  /**
   * Restrict query to rows linked to any of `userIds`.
   * Shared by Team filter / "assigned to my team" across modules.
   */
  applyUserIdsFilter<T>(
    query: SelectQueryBuilder<T>,
    userIds: number[],
    options: ApplyUserIdsFilterOptions = {},
  ): void {
    const ids = Array.from(
      new Set(
        (userIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (!ids.length) {
      query.andWhere("1 = 0");
      return;
    }

    const key = options.paramKey || "dataScopeUserIds";
    const parts: string[] = [];
    const params: Record<string, unknown> = { [key]: ids };

    for (const col of options.columns || []) {
      parts.push(`${col} IN (:...${key})`);
    }
    if (options.intArrayColumn) {
      parts.push(`${options.intArrayColumn} && :${key}Arr::int[]`);
      params[`${key}Arr`] = ids;
    }
    if (options.jsonbUserIdsColumn) {
      parts.push(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(${options.jsonbUserIdsColumn}, '[]'::jsonb)) AS _ds_assignee
          WHERE (_ds_assignee->>'user_id')::int IN (:...${key})
        )`,
      );
    }

    if (!parts.length) {
      this.logger.warn(
        "applyUserIdsFilter called without columns / intArrayColumn / jsonbUserIdsColumn",
      );
      return;
    }

    query.andWhere(`(${parts.join(" OR ")})`, params);

    const excludeId = Number(options.excludeAssigneeUserId);
    if (excludeId > 0) {
      const exKey = `${key}Exclude`;
      const notParts: string[] = [];
      if (options.intArrayColumn) {
        notParts.push(
          `(${options.intArrayColumn} IS NULL OR NOT (${options.intArrayColumn} @> ARRAY[:${exKey}]::int[]))`,
        );
      }
      if (options.jsonbUserIdsColumn) {
        notParts.push(
          `(${options.jsonbUserIdsColumn} IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(${options.jsonbUserIdsColumn}) AS _ds_ex
            WHERE (_ds_ex->>'user_id')::int = :${exKey}
          ))`,
        );
      }
      if (notParts.length) {
        query.andWhere(`(${notParts.join(" AND ")})`, { [exKey]: excludeId });
      }
    }
  }

  /**
   * Filter to the manager's reporting tree (not self).
   * Use for "team" tabs / views in any module.
   */
  async applyReportingTeamFilter<T>(
    query: SelectQueryBuilder<T>,
    managerId: number,
    options: Omit<ApplyUserIdsFilterOptions, "excludeAssigneeUserId"> & {
      /** Default true: exclude manager from assignee match (team tab). */
      excludeSelf?: boolean;
    } = {},
  ): Promise<void> {
    const mid = Number(managerId);
    const reportIds = await this.getReportingTeamIds(mid);
    const { excludeSelf = true, ...filterOpts } = options;
    this.applyUserIdsFilter(query, reportIds, {
      ...filterOpts,
      paramKey: filterOpts.paramKey || `reportTeam_${mid}`,
      excludeAssigneeUserId: excludeSelf ? mid : undefined,
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
    if (scope.bypass || scope.type === "org" || scope.allowedUserIds == null) {
      return;
    }

    if (!scope.allowedUserIds.length) {
      throw new ForbiddenException("You do not have access to this record");
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
