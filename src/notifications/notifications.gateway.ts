import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationsService } from "./notifications.service";

const userSockets = new Map<number, Set<string>>();

const WS_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://192.168.2.131:3001",
  "http://192.168.0.106:5173",
  "https://mtjf-erp.vercel.app",
  "https://mtjf-site.vercel.app",
  "https://www.mtjfoundation.org",
  "https://mtjfoundation.org",
  "https://donation.mtjfoundation.org",
  "https://erp.mtjfoundation.pk",
  "http://31.97.223.158:8081",
  "http://18.143.123.75",
  "https://18.143.123.75",
];

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (
        process.env.NODE_ENV !== "production" &&
        (origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.startsWith("http://192.168."))
      ) {
        return callback(null, true);
      }
      if (WS_ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  namespace: "/ws_notifications",
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit() {
    this.logger.log("Notifications WebSocket ready on /ws_notifications");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string) ||
        client.handshake.headers?.authorization?.replace("Bearer ", "") ||
        client.handshake.headers?.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("jwt="))
          ?.split("=")[1]
          ?.trim();

      if (!token) {
        this.logger.warn(`WS auth failed: no token (socket ${client.id})`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "your-secret-key",
      });

      const userId = Number(payload.sub || payload.id || payload.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        this.logger.warn(`WS auth failed: invalid user id (socket ${client.id})`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(client.id);
      client.join(`user_${userId}`);

      this.logger.log(
        `WS connected user=${userId} socket=${client.id} tabs=${userSockets.get(userId)!.size}`,
      );

      try {
        const unreadCount =
          await this.notificationsService.getUnreadCount(userId);
        client.emit("unread_count", { count: unreadCount });
      } catch (error: any) {
        this.logger.error(
          `Failed unread count on connect for user ${userId}: ${error.message}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`WS connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = Number(client.data?.userId);
    if (!Number.isFinite(userId) || userId <= 0) return;

    const sockets = userSockets.get(userId);
    if (!sockets) return;

    sockets.delete(client.id);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
    this.logger.log(
      `WS disconnected user=${userId} socket=${client.id} remaining=${sockets.size}`,
    );
  }

  emitUnreadCount(userId: number, count: number) {
    const id = Number(userId);
    if (!this.server || !Number.isFinite(id)) return;
    this.server.to(`user_${id}`).emit("unread_count", { count });
  }

  async sendNotificationToUsers(userIds: number[], notification: any) {
    if (!this.server || !userIds?.length) return;

    for (const rawId of userIds) {
      const userId = Number(rawId);
      if (!Number.isFinite(userId) || userId <= 0) continue;

      const sockets = userSockets.get(userId);
      if (!sockets || sockets.size === 0) {
        this.logger.debug(`User ${userId} offline — notification saved only`);
        continue;
      }

      this.server.to(`user_${userId}`).emit("new_notification", notification);

      try {
        const unreadCount =
          await this.notificationsService.getUnreadCount(userId);
        this.emitUnreadCount(userId, unreadCount);
      } catch (error: any) {
        this.logger.error(
          `Failed unread count emit for user ${userId}: ${error.message}`,
        );
      }
    }
  }

  async sendNotificationToUser(userId: number, notification: any) {
    await this.sendNotificationToUsers([userId], notification);
  }

  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ) {
    const userId = Number(client.data?.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return { success: false, message: "User not authenticated" };
    }

    try {
      await this.notificationsService.markAsRead(
        Number(data.notificationId),
        userId,
      );
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit("unread_count", { count: unreadCount });
      return { success: true, message: "Notification marked as read" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage("get_unread_count")
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = Number(client.data?.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return { success: false, message: "User not authenticated" };
    }

    try {
      const count = await this.notificationsService.getUnreadCount(userId);
      return { success: true, count };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
