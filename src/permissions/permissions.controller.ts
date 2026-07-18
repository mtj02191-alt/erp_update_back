import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  ParseIntPipe,
} from "@nestjs/common";
import { PermissionsService } from "./permissions.service";
import { PermissionsGuard } from "./guards/permissions.guard";
import { RequiredPermission } from "./decorators/require-permission.decorator";

@Controller("permissions")
@UseGuards(PermissionsGuard)
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  @Get("user/:userId")
  @RequiredPermission("permissions.view")
  async getUserPermissions(@Param("userId", ParseIntPipe) userId: number) {
    try {
      const permissions =
        await this.permissionsService.getUserPermissions(userId);
      return {
        success: true,
        data: {
          userId,
          permissions,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching permissions for user ${userId}:`,
        error.stack,
      );
      return {
        success: false,
        message: "Failed to fetch user permissions",
      };
    }
  }

  @Get("user/:userId/refresh")
  @RequiredPermission("permissions.view")
  async refreshUserPermissions(@Param("userId", ParseIntPipe) userId: number) {
    try {
      const permissions =
        await this.permissionsService.refreshUserPermissions(userId);
      return {
        success: true,
        data: {
          userId,
          permissions,
        },
        message: "Permissions refreshed from database",
      };
    } catch (error) {
      this.logger.error(
        `Error refreshing permissions for user ${userId}:`,
        error.stack,
      );
      return {
        success: false,
        message: "Failed to refresh user permissions",
      };
    }
  }

  @Put("user/:userId")
  @RequiredPermission("permissions.edit")
  async updateUserPermissions(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: { permissions: Record<string, any> },
  ) {
    try {
      const updatedPermissions =
        await this.permissionsService.updateUserPermissions(
          userId,
          body.permissions,
        );
      return {
        success: true,
        data: updatedPermissions,
        message: "User permissions updated successfully",
      };
    } catch (error) {
      this.logger.error(
        `Error updating permissions for user ${userId}:`,
        error.stack,
      );
      return {
        success: false,
        message: "Failed to update user permissions",
      };
    }
  }

  @Delete("user/:userId")
  @RequiredPermission("permissions.delete")
  async deleteUserPermissions(@Param("userId", ParseIntPipe) userId: number) {
    try {
      await this.permissionsService.deleteUserPermissions(userId);
      return {
        success: true,
        message: "User permissions deleted successfully",
      };
    } catch (error) {
      this.logger.error(
        `Error deleting permissions for user ${userId}:`,
        error.stack,
      );
      return {
        success: false,
        message: "Failed to delete user permissions",
      };
    }
  }

  @Get("all")
  @RequiredPermission("permissions.view")
  async getAllUserPermissions() {
    try {
      const allPermissions =
        await this.permissionsService.getAllUserPermissions();
      return {
        success: true,
        data: allPermissions,
      };
    } catch (error) {
      this.logger.error("Error fetching all user permissions:", error.stack);
      return {
        success: false,
        message: "Failed to fetch all user permissions",
      };
    }
  }
}
