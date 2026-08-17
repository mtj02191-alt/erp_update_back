export type DataScopeType = "self" | "team" | "department" | "org";

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
