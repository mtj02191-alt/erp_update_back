export type DataScopeType = "self" | "team" | "department" | "org";

/** List filter modes — narrows within the resolved data-access ceiling. */
export type TeamFilterMode = "all" | "me" | "direct" | "entire" | "user";

export interface TeamFilterInput {
  mode?: TeamFilterMode | string | null;
  userId?: number | null;
}

export interface ResolvedDataScope {
  /** Super admin — no row filtering */
  bypass: boolean;
  type: DataScopeType;
  /** null = no created_by filter (org / bypass) */
  allowedUserIds: number[] | null;
  userId: number;
  userDepartment?: string;
}

export interface ApplyScopeOptions {
  /** Extra column (e.g. donor.assigned_to) matched against allowedUserIds */
  assignedToColumn?: string;
}

/** Inputs for resolveListScope (Access Scope + Team filter in one call). */
export interface ResolveListScopeInput {
  userId: number | null | undefined;
  userRole?: string;
  userDepartment?: string;
  permissionDepartment: string;
  module: string;
  teamFilter?: string | null;
  teamFilterUserId?: string | number | null;
}

/**
 * Match rows to a set of user ids (shared by Team filter / team listings).
 * Supports scalar FKs, Postgres int[], and jsonb [{ user_id }].
 */
export interface ApplyUserIdsFilterOptions {
  /** Unique suffix so multiple filters in one query don't clash */
  paramKey?: string;
  /** Scalar columns storing user id, e.g. ["donor.created_by", "donor.assigned_to"] */
  columns?: string[];
  /** int[] column, e.g. "task.assigned_user_ids" */
  intArrayColumn?: string;
  /** jsonb array of objects with user_id, e.g. "task.assigned_users_meta" */
  jsonbUserIdsColumn?: string;
  /**
   * Also require this user is NOT an assignee (team tab: reports' work, not mine).
   * Uses intArrayColumn / jsonbUserIdsColumn when set.
   */
  excludeAssigneeUserId?: number;
}
