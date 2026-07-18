import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Res,
  UseGuards,
  Query,
  Req,
} from "@nestjs/common";
import { Response } from "express";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";
import { FilterPayload } from "../utils/filters/common-filter.util";
import { ConditionalJwtGuard } from "../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions";
import { JwtGuard } from "../auth/jwt.guard";

@Controller("notifications")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequiredPermissions(["notifications.create", "super_admin"])
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      const result = await this.notificationsService.create(
        createNotificationDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Notification created successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("search")
  @RequiredPermissions(["notifications.list_view", "super_admin"])
  async findAll(@Body() payload: any, @Res() res: Response, @Req() req: any) {
    try {
      const user = req?.user ?? null;

      // Extract pagination and sorting
      const pagination = payload.pagination || {};
      const page = pagination.page || 1;
      let pageSize = pagination.pageSize || 10;
      if (pagination.pageSize == 0) {
        pageSize = 0;
      }

      const sortField = pagination.sortField || "created_at";
      const sortOrder = pagination.sortOrder || "DESC";

      // Extract filters
      const filters: FilterPayload = payload.filters || {};

      const result = await this.notificationsService.findAll(
        page,
        pageSize,
        sortField,
        sortOrder,
        filters,
        user,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Notifications retrieved successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get()
  @RequiredPermissions(["notifications.list_view", "super_admin"])
  async findAllGet(
    @Query("page") page: string = "1",
    @Query("pageSize") pageSize: string = "10",
    @Query("sortField") sortField: string = "created_at",
    @Query("sortOrder") sortOrder: string = "DESC",
    @Query("search") search: string = "",
    @Query("type") type: string = "",
    @Query("is_read") is_read: string = "",
    @Query("user_id") user_id: string = "",
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      const filters: FilterPayload = {
        search,
        type,
        is_read: is_read ? is_read === "true" : undefined,
        user_id: user_id ? parseInt(user_id, 10) : undefined,
      };

      const result = await this.notificationsService.findAll(
        parseInt(page, 10),
        parseInt(pageSize, 10),
        sortField,
        sortOrder.toUpperCase() as "ASC" | "DESC",
        filters,
        user,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Notifications retrieved successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  @Get("unread-count")
  @UseGuards(JwtGuard)
  async getUnreadCount(@Req() req: any, @Res() res: Response) {
    try {
      const user = req?.user;
      if (!user || !user.id) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
          data: null,
        });
      }

      const count = await this.notificationsService.getUnreadCount(user.id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Unread count retrieved successfully",
        data: { count },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions(["notifications.view", "super_admin"])
  async findOne(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user;
      const userId = user && user.id ? user.id : undefined;
      const result = await this.notificationsService.findOne(+id, userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Notification retrieved successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions(["notifications.update", "super_admin"])
  async update(
    @Param("id") id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user ?? null;
      const result = await this.notificationsService.update(
        +id,
        updateNotificationDto,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Notification updated successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id/read")
  @UseGuards(JwtGuard)
  async markAsRead(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      const user = req?.user;
      if (!user || !user.id) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
          data: null,
        });
      }
      const result = await this.notificationsService.markAsRead(
        +id,
        user.id,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Notification marked as read",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Post("mark-all-read")
  @UseGuards(JwtGuard)
  async markAllAsRead(@Res() res: Response, @Req() req: any) {
    try {
      const user = req?.user;
      if (!user || !user.id) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: "User not authenticated",
          data: null,
        });
      }

      const result = await this.notificationsService.markAllAsRead(
        user.id,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions(["notifications.delete", "super_admin"])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.notificationsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
