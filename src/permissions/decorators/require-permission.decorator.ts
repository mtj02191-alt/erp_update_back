import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "permission";

/**
 * Decorator to specify required permission for a route
 * @param permission - Permission path as string (e.g., 'accounts_and_finance.view') or array
 * @returns MethodDecorator
 */
export const RequiredPermission = (permission: string | string[]) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Alternative decorator with more descriptive name
 * @param permission - Permission path as string (e.g., 'accounts_and_finance.view') or array
 * @returns MethodDecorator
 */
export const RequiredPermissions = (permission: string | string[]) =>
  SetMetadata(PERMISSION_KEY, permission);
