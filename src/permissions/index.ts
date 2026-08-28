// Export the main module
export { PermissionsModule } from "./permissions.module";

// Export services
export { PermissionsService } from "./permissions.service";
export { DataScopeService } from "./data-scope/data-scope.service";
export type {
  ApplyUserIdsFilterOptions,
  DataScopeType,
  ResolveListScopeInput,
  ResolvedDataScope,
  TeamFilterInput,
  TeamFilterMode,
} from "./data-scope/data-scope.types";
export { GeographicScopeService } from "./geographic-scope/geographic-scope.service";
export type {
  GeographicEntityKey,
  GeographicScopeSummary,
  ResolvedGeographicScope,
} from "./geographic-scope/geographic-scope.types";

// Export guards
export { PermissionsGuard } from "./guards/permissions.guard";

// Export decorators
export {
  RequiredPermission,
  RequiredPermissions,
  PERMISSION_KEY,
} from "./decorators/require-permission.decorator";

export {
  DONATION_VIEW_PERMISSIONS,
  DONATION_CREATE_PERMISSIONS,
  DONATION_UPDATE_PERMISSIONS,
  DONATION_DELETE_PERMISSIONS,
  DONATION_VIEW_GUARD,
  DONATION_VIEW_STAFF_GUARD,
  DONATION_LIST_VIEW_PERMISSIONS,
  DONATION_FILTER_OPTIONS_GUARD,
  DONATION_CREATE_GUARD,
  DONATION_UPDATE_GUARD,
  DONATION_DELETE_GUARD,
} from "./donation-permissions.constants";

export {
  ORGANIZATION_LIST_GUARD,
  ORGANIZATION_VIEW_GUARD,
  ORGANIZATION_CREATE_GUARD,
  ORGANIZATION_UPDATE_GUARD,
  ORGANIZATION_DELETE_GUARD,
} from "./organization-permissions.constants";

export {
  AID_PEOPLE_LIST_GUARD,
  AID_PEOPLE_VIEW_GUARD,
  AID_PEOPLE_CREATE_GUARD,
  AID_PEOPLE_UPDATE_GUARD,
  AID_PEOPLE_DELETE_GUARD,
  AID_APPLICATIONS_LIST_GUARD,
  AID_APPLICATIONS_VIEW_GUARD,
  AID_APPLICATIONS_CREATE_GUARD,
  AID_APPLICATIONS_UPDATE_GUARD,
  AID_APPLICATIONS_DELETE_GUARD,
  AID_APPLICATIONS_CEO_GUARD,
  AID_APPLICATIONS_DELIVER_GUARD,
} from "./aid-permissions.constants";

// Export entities
export { PermissionsEntity } from "./entities/permissions.entity";

// Export controller
export { PermissionsController } from "./permissions.controller";
