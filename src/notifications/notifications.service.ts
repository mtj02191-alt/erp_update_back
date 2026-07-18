import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./entities/notification.entity";
import { UserNotification } from "./entities/user-notification.entity";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";
import {
  applyCommonFilters,
  FilterPayload,
} from "../utils/filters/common-filter.util";
import { NotificationsGateway } from "./notifications.gateway";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  type?: string;
  is_read?: boolean;
  user_id?: number;
}

@Injectable()
export class NotificationsService {
  // Define searchable columns for notification search
  private readonly searchableColumns = ["title", "message"];

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    @Optional()
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway?: NotificationsGateway,
  ) {}

  /**
   * Create a notification and assign it to one or more users
   * @param createNotificationDto - Notification data
   * @param userIds - Array of user IDs to send notification to
   * @param user - User creating the notification (for created_by)
   */
  async create(
    createNotificationDto: CreateNotificationDto,
    userIds?: number[],
    user?: any,
  ): Promise<Notification> {
    try {
      // Create the notification (one record)
      const notification = this.notificationRepository.create({
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type || NotificationType.INFO,
        link: createNotificationDto.link || null,
        metadata: createNotificationDto.metadata || null,
      });

      // Set created_by if user is provided and is a valid user object
      if (user && user.id && user.id !== -1) {
        notification.created_by = user;
      }

      const savedNotification =
        await this.notificationRepository.save(notification);

      // Determine which users to notify
      const usersToNotify: number[] = [];

      // Create user_notification records for each user
      if (userIds && userIds.length > 0) {
        usersToNotify.push(...userIds);
        const userNotifications = userIds.map((userId) =>
          this.userNotificationRepository.create({
            notification_id: savedNotification.id,
            user_id: userId,
            is_read: false,
          }),
        );
        await this.userNotificationRepository.save(userNotifications);
      } else if (createNotificationDto.user_id) {
        // If single user_id provided in DTO, create one user_notification
        usersToNotify.push(createNotificationDto.user_id);
        const userNotification = this.userNotificationRepository.create({
          notification_id: savedNotification.id,
          user_id: createNotificationDto.user_id,
          is_read: false,
        });
        await this.userNotificationRepository.save(userNotification);
      }

      // Send real-time notification via WebSocket
      if (usersToNotify.length > 0 && this.notificationsGateway) {
        try {
          await this.notificationsGateway.sendNotificationToUsers(
            usersToNotify,
            {
              id: savedNotification.id,
              title: savedNotification.title,
              message: savedNotification.message,
              type: savedNotification.type,
              link: savedNotification.link,
              metadata: savedNotification.metadata,
              created_at: savedNotification.created_at,
              is_read: false,
            },
          );
        } catch (error) {
          console.error(
            "Failed to send WebSocket notification:",
            error.message,
          );
          // Don't throw - notification is already saved
        }
      }

      return savedNotification;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create notification: ${error.message}`,
      );
    }
  }

  async findAll(
    page = 1,
    pageSize = 10,
    sortField = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
    filters: FilterPayload = {},
    user?: any,
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const userId = filters.user_id || (user && user.id ? user.id : null);

      if (!userId) {
        throw new BadRequestException(
          "User ID is required to fetch notifications",
        );
      }

      // Query notifications through user_notifications junction table
      const queryBuilder = this.notificationRepository
        .createQueryBuilder("notification")
        .innerJoin("notification.userNotifications", "userNotification")
        .leftJoinAndSelect("notification.created_by", "created_by")
        .where("userNotification.user_id = :userId", { userId })
        .andWhere("notification.is_archived = :is_archived", {
          is_archived: false,
        });

      // Apply common filters using utility
      // Exclude user_id from common filters since it's handled via userNotification join
      const filtersForCommon = { ...filters };
      delete filtersForCommon.user_id; // Remove user_id as it's handled separately
      applyCommonFilters(
        queryBuilder,
        filtersForCommon,
        this.searchableColumns,
        "notification",
      );

      // Apply type filter if provided
      if (filters.type) {
        queryBuilder.andWhere("notification.type = :type", {
          type: filters.type,
        });
      }

      // Apply is_read filter if provided (from user_notification)
      if (filters.is_read !== undefined) {
        queryBuilder.andWhere("userNotification.is_read = :is_read", {
          is_read: filters.is_read,
        });
      }

      // Apply sorting
      const validSortFields = ["title", "type", "created_at"];
      const sortFieldName = validSortFields.includes(sortField)
        ? sortField
        : "created_at";
      queryBuilder.orderBy(`notification.${sortFieldName}`, sortOrder);

      // Add is_read and read_at from user_notification to the select
      queryBuilder.addSelect("userNotification.is_read", "user_is_read");
      queryBuilder.addSelect("userNotification.read_at", "user_read_at");
      queryBuilder.addSelect("userNotification.id", "user_notification_id");

      // Apply pagination
      queryBuilder.skip(skip).take(pageSize);

      // Execute query - get both notification and user_notification data
      queryBuilder.addSelect("notification.id", "notification_id");
      queryBuilder.addSelect("notification.title", "notification_title");
      queryBuilder.addSelect("notification.message", "notification_message");
      queryBuilder.addSelect("notification.type", "notification_type");
      queryBuilder.addSelect("notification.link", "notification_link");
      queryBuilder.addSelect("notification.metadata", "notification_metadata");
      queryBuilder.addSelect(
        "notification.created_at",
        "notification_created_at",
      );
      queryBuilder.addSelect(
        "notification.updated_at",
        "notification_updated_at",
      );

      const rawResults = await queryBuilder.getRawMany();
      const total = await queryBuilder.getCount();

      // Transform results to include user notification data
      const data = rawResults.map((row) => ({
        id: row.notification_id,
        title: row.notification_title,
        message: row.notification_message,
        type: row.notification_type,
        link: row.notification_link,
        metadata: row.notification_metadata,
        created_at: row.notification_created_at,
        updated_at: row.notification_updated_at,
        is_read: row.user_is_read,
        read_at: row.user_read_at,
        user_notification_id: row.user_notification_id,
      }));

      const totalPages = Math.ceil(total / pageSize);

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve notifications: ${error.message}`,
      );
    }
  }

  async findOne(id: number, userId?: number): Promise<any> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
        relations: ["created_by", "userNotifications"],
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      // If userId provided, get user-specific data
      if (userId) {
        const userNotification = await this.userNotificationRepository.findOne({
          where: { notification_id: id, user_id: userId },
        });

        return {
          ...notification,
          is_read: userNotification?.is_read || false,
          read_at: userNotification?.read_at || null,
        };
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve notification: ${error.message}`,
      );
    }
  }

  async update(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
    user?: any,
  ): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
      });
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      // Update notification fields
      if (updateNotificationDto.title !== undefined) {
        notification.title = updateNotificationDto.title;
      }
      if (updateNotificationDto.message !== undefined) {
        notification.message = updateNotificationDto.message;
      }
      if (updateNotificationDto.type !== undefined) {
        notification.type = updateNotificationDto.type;
      }
      if (updateNotificationDto.link !== undefined) {
        notification.link = updateNotificationDto.link;
      }
      if (updateNotificationDto.metadata !== undefined) {
        notification.metadata = updateNotificationDto.metadata;
      }

      // Set updated_by if user is provided
      if (user && user.id && user.id !== -1) {
        notification.updated_by = user;
      }

      return await this.notificationRepository.save(notification);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update notification: ${error.message}`,
      );
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
      });
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      // Cascade delete will handle user_notifications
      await this.notificationRepository.delete(id);
      return { message: "Notification deleted successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete notification: ${error.message}`,
      );
    }
  }

  async markAsRead(
    notificationId: number,
    userId: number,
    user?: any,
  ): Promise<UserNotification> {
    try {
      const userNotification = await this.userNotificationRepository.findOne({
        where: { notification_id: notificationId, user_id: userId },
      });

      if (!userNotification) {
        throw new NotFoundException(`Notification not found for user`);
      }

      userNotification.is_read = true;
      userNotification.read_at = new Date();

      if (user && user.id && user.id !== -1) {
        userNotification.updated_by = user;
      }

      const saved =
        await this.userNotificationRepository.save(userNotification);

      // Update unread count via WebSocket
      if (this.notificationsGateway) {
        try {
          const unreadCount = await this.getUnreadCount(userId);
          // Emit unread count update to user's room
          this.notificationsGateway.server
            .to(`user_${userId}`)
            .emit("unread_count", { count: unreadCount });
        } catch (error) {
          console.error("Failed to send WebSocket update:", error.message);
        }
      }

      return saved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to mark notification as read: ${error.message}`,
      );
    }
  }

  async markAllAsRead(
    userId: number,
    user?: any,
  ): Promise<{ message: string; count: number }> {
    try {
      const result = await this.userNotificationRepository
        .createQueryBuilder()
        .update(UserNotification)
        .set({
          is_read: true,
          read_at: new Date(),
        })
        .where("user_id = :userId", { userId })
        .andWhere("is_read = :is_read", { is_read: false })
        .andWhere("is_archived = :is_archived", { is_archived: false })
        .execute();

      return {
        message: "All notifications marked as read",
        count: result.affected || 0,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.userNotificationRepository.count({
        where: {
          user_id: userId,
          is_read: false,
          is_archived: false,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to get unread count: ${error.message}`,
      );
    }
  }
}
