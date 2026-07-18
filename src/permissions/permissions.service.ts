import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PermissionsEntity } from "./entities/permissions.entity";

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(PermissionsEntity)
    private readonly permissionsRepository: Repository<PermissionsEntity>,
  ) {}

  /**
   * Check if user has the specified permission
   * @param userId - User ID
   * @param permissionPath - Permission path as array or dot-separated string
   * @returns Promise<boolean>
   */
  async hasPermission(
    userId: number,
    permissionPath: string[] | string,
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      this.logger.debug(
        `Checking permission for user ${userId}, path: ${permissionPath}, permissions:`,
        userPermissions,
      );
      return this.checkNestedPermission(userPermissions, permissionPath);
    } catch (error) {
      this.logger.error(
        `Error checking permission for user ${userId}:`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Force refresh user permissions from database (bypass cache)
   * @param userId - User ID
   * @returns Promise<Record<string, any>>
   */
  async refreshUserPermissions(userId: number): Promise<Record<string, any>> {
    try {
      // Clear any potential cache and force a fresh query
      await this.permissionsRepository.query("SELECT 1"); // Force connection refresh

      const userPermission = await this.permissionsRepository
        .createQueryBuilder("permissions")
        .where("permissions.user_id = :userId", { userId })
        .getOne();

      this.logger.debug(
        `Refreshed permissions for user ${userId}:`,
        userPermission?.permissions,
      );
      return userPermission?.permissions || {};
    } catch (error) {
      this.logger.error(
        `Error refreshing permissions for user ${userId}:`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Get user permissions from database
   * @param userId - User ID
   * @returns Promise<Record<string, any>>
   */
  async getUserPermissions(userId: number): Promise<Record<string, any>> {
    try {
      // Use createQueryBuilder to bypass any potential caching
      const userPermission = await this.permissionsRepository
        .createQueryBuilder("permissions")
        .where("permissions.user_id = :userId", { userId })
        .getOne();

      this.logger.debug(
        `Fetched permissions for user ${userId}:`,
        userPermission?.permissions,
      );
      return userPermission?.permissions || {};
    } catch (error) {
      this.logger.error(
        `Error fetching permissions for user ${userId}:`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Check nested permission in permission object
   * @param permissions - User permissions object
   * @param path - Permission path as array or dot-separated string
   * @returns boolean
   */
  private checkNestedPermission(
    permissions: Record<string, any>,
    path: string[] | string,
  ): boolean {
    try {
      // Convert string path to array if needed
      const pathArray = typeof path === "string" ? path.split(".") : path;

      if (pathArray.length === 0) return false;

      let current = permissions;

      // Traverse the permission object
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current || typeof current !== "object") return false;
        current = current[pathArray[i]];
      }

      // Check the final action
      const action = pathArray[pathArray.length - 1];
      return current && typeof current[action] === "boolean"
        ? current[action]
        : false;
    } catch (error) {
      this.logger.error("Error checking nested permission:", error.stack);
      return false;
    }
  }

  /**
   * Update user permissions
   * @param userId - User ID
   * @param permissions - New permissions object
   * @returns Promise<PermissionsEntity>
   */
  async updateUserPermissions(
    userId: number,
    permissions: Record<string, any>,
  ): Promise<PermissionsEntity> {
    try {
      let userPermission = await this.permissionsRepository.findOne({
        where: { user_id: userId },
      });

      if (userPermission) {
        // Update existing permissions
        userPermission.permissions = permissions;
        userPermission.updated_at = new Date();
        const saved = await this.permissionsRepository.save(userPermission);
        this.logger.debug(
          `Updated permissions for user ${userId}:`,
          saved.permissions,
        );
        return saved;
      } else {
        // Create new permissions record
        userPermission = this.permissionsRepository.create({
          user_id: userId,
          permissions,
        });
        const saved = await this.permissionsRepository.save(userPermission);
        this.logger.debug(
          `Created permissions for user ${userId}:`,
          saved.permissions,
        );
        return saved;
      }
    } catch (error) {
      this.logger.error(
        `Error updating permissions for user ${userId}:`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete user permissions
   * @param userId - User ID
   * @returns Promise<void>
   */
  async deleteUserPermissions(userId: number): Promise<void> {
    try {
      await this.permissionsRepository.delete({ user_id: userId });
    } catch (error) {
      this.logger.error(
        `Error deleting permissions for user ${userId}:`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all users with their permissions
   * @returns Promise<PermissionsEntity[]>
   */
  async getAllUserPermissions(): Promise<PermissionsEntity[]> {
    try {
      return await this.permissionsRepository.find({
        relations: ["user"],
      });
    } catch (error) {
      this.logger.error("Error fetching all user permissions:", error.stack);
      throw error;
    }
  }
}
