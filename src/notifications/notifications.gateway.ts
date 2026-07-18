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
import {
  Logger,
  Inject,
  forwardRef,
  Optional,
  OnModuleInit,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationsService } from "./notifications.service";

// Map to store user ID to socket connections
const userSockets = new Map<number, Set<string>>();

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all localhost origins in development
      if (process.env.NODE_ENV !== "production") {
        if (
          !origin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
      }

      // Production origins
      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? [
              "https://mtjf-erp.vercel.app",
              "https://www.mtjfoundation.org",
              "https://mtjfoundation.org",
            ]
          : [
              "http://localhost:5173",
              "http://localhost:3000",
              "http://localhost:3001",
              "http://127.0.0.1:5173",
              "http://192.168.2.131:3001",
            ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  namespace: "/ws_notifications",
})
export class NotificationsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  onModuleInit() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 onModuleInit() CALLED");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("🚀 onModuleInit() called");
    this.logger.log("✅ NotificationsGateway module initialized");
    this.logger.log("Gateway namespace: /ws_notifications");
    this.logger.log("WebSocket server ready to accept connections");

    // Log when server is ready
    if (this.server) {
      console.log("✅ Socket.IO server instance available in onModuleInit");
      this.logger.log(`✅ Socket.IO server instance available`);
      this.logger.log(
        `Server ready to accept connections on namespace: /ws_notifications`,
      );
    } else {
      console.log(
        "⚠️ Socket.IO server instance NOT available yet (will be in afterInit)",
      );
      this.logger.warn(`⚠️ Socket.IO server instance NOT available yet`);
      this.logger.warn(
        `This is normal - server will be injected in afterInit()`,
      );
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  afterInit(server: Server) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎯 afterInit() CALLED - Server instance injected!");
    console.log("Server ready on namespace: /ws_notifications");
    console.log("Server instance:", !!server);
    console.log("Server type:", server?.constructor?.name || "unknown");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("🎯 afterInit() called - Server instance injected");
    this.logger.log(`✅ Socket.IO server instance is now available`);
    this.logger.log(
      `Server ready to accept connections on namespace: /ws_notifications`,
    );
    this.logger.log(`🔌 Listening for WebSocket connections...`);
    console.log("✅ Socket.IO server is ready and listening for connections");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  private notificationsService: NotificationsService;

  constructor(
    private jwtService: JwtService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    notificationsService?: NotificationsService,
  ) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 NotificationsGateway Constructor CALLED");
    console.log("Namespace: /ws_notifications");
    console.log("JWT Service: Available");
    console.log("NotificationsService injected:", !!notificationsService);
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("🚀 NotificationsGateway Constructor");
    this.logger.log("Namespace: /ws_notifications");
    this.logger.log("JWT Service: Available");
    this.logger.log("NotificationsService injected:", !!notificationsService);
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Set service if injected
    if (notificationsService) {
      this.notificationsService = notificationsService;
      this.logger.log("✅ NotificationsService set from constructor injection");
    }
  }

  // Set service after both are created (fallback method for factory pattern)
  setNotificationsService(service: NotificationsService) {
    console.log("🔧 setNotificationsService() called");
    this.notificationsService = service;
    this.logger.log("✅ NotificationsService injected into gateway");
    console.log("✅ NotificationsService injected into gateway");
  }

  async handleConnection(client: Socket) {
    const startTime = Date.now();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔌 handleConnection() CALLED - Socket.IO connection attempt!");
    console.log(`Socket ID: ${client.id}`);
    try {
      this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.logger.log(`🔌 NEW CONNECTION ATTEMPT`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🔌 NEW CONNECTION ATTEMPT`);
      this.logger.log(`Socket ID: ${client.id}`);
      this.logger.log(`Timestamp: ${new Date().toISOString()}`);
      this.logger.log(`Origin: ${client.handshake.headers.origin || "N/A"}`);
      this.logger.log(
        `User-Agent: ${client.handshake.headers["user-agent"] || "N/A"}`,
      );
      this.logger.log(`Transport: ${client.conn.transport.name}`);
      this.logger.log(`Namespace: ${client.nsp.name}`);

      // Log handshake details
      this.logger.log(`📋 Handshake Details:`);
      this.logger.log(
        `  - Auth: ${JSON.stringify(client.handshake.auth || {})}`,
      );
      this.logger.log(
        `  - Query: ${JSON.stringify(client.handshake.query || {})}`,
      );
      this.logger.log(
        `  - Headers: ${JSON.stringify({
          origin: client.handshake.headers.origin,
          cookie: client.handshake.headers.cookie ? "Present" : "Missing",
          authorization: client.handshake.headers.authorization
            ? "Present"
            : "Missing",
        })}`,
      );

      // Extract token from multiple sources (priority order)
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
        this.logger.warn(`❌ AUTHENTICATION FAILED: No token found`);
        this.logger.warn(`Token sources checked:`);
        this.logger.warn(`  - auth.token: ${!!client.handshake.auth?.token}`);
        this.logger.warn(`  - query.token: ${!!client.handshake.query?.token}`);
        this.logger.warn(
          `  - header.authorization: ${!!client.handshake.headers?.authorization}`,
        );
        this.logger.warn(
          `  - cookie.jwt: ${!!client.handshake.headers?.cookie?.includes("jwt=")}`,
        );
        this.logger.warn(`Disconnecting client ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.log(`✅ Token found (length: ${token.length} chars)`);
      this.logger.log(
        `Token source: ${client.handshake.auth?.token ? "auth" : client.handshake.query?.token ? "query" : client.handshake.headers?.authorization ? "header" : "cookie"}`,
      );

      // Verify JWT token
      this.logger.log(`🔐 Verifying JWT token...`);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "your-secret-key",
      });
      this.logger.log(`✅ Token verified successfully`);

      const userId = payload.sub || payload.id || payload.userId;
      if (!userId) {
        this.logger.warn(`❌ Invalid token payload - no user ID found`);
        this.logger.warn(`Payload keys: ${Object.keys(payload).join(", ")}`);
        this.logger.warn(`Disconnecting client ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.log(`👤 User ID extracted: ${userId}`);
      this.logger.log(
        `Token payload: ${JSON.stringify({ id: userId, email: payload.email, role: payload.role })}`,
      );

      // Store user ID in socket data
      client.data.userId = userId;

      // Add socket to user's socket set
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
        this.logger.log(`📝 Created new socket set for user ${userId}`);
      }
      userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user_${userId}`);
      this.logger.log(`🏠 Joined room: user_${userId}`);

      const connectionTime = Date.now() - startTime;
      const totalConnections = userSockets.get(userId)!.size;
      this.logger.log(`✅ CONNECTION SUCCESSFUL`);
      this.logger.log(`  - User: ${userId}`);
      this.logger.log(`  - Socket: ${client.id}`);
      this.logger.log(`  - Total connections for user: ${totalConnections}`);
      this.logger.log(`  - Connection time: ${connectionTime}ms`);
      this.logger.log(`  - Total active users: ${userSockets.size}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Send unread count on connection
      if (this.notificationsService) {
        try {
          const unreadCount =
            await this.notificationsService.getUnreadCount(userId);
          client.emit("unread_count", { count: unreadCount });
          this.logger.log(
            `📊 Sent unread count to user ${userId}: ${unreadCount}`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to get unread count for user ${userId}: ${error.message}`,
          );
        }
      } else {
        this.logger.warn(`⚠️ NotificationsService not available`);
      }
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.error(`❌ CONNECTION ERROR`);
      this.logger.error(`Socket ID: ${client.id}`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Error type: ${error.constructor.name}`);
      this.logger.error(`Connection time before error: ${connectionTime}ms`);
      if (error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      this.logger.error(`Disconnecting client ${client.id}`);
      this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log(`🔌 DISCONNECTION`);
    this.logger.log(`Socket ID: ${client.id}`);
    this.logger.log(`User ID: ${userId || "Unknown (not authenticated)"}`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);

    if (userId) {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        const beforeSize = userSocketSet.size;
        userSocketSet.delete(client.id);
        const afterSize = userSocketSet.size;

        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          this.logger.log(
            `📝 Removed user ${userId} from active connections (no more sockets)`,
          );
        } else {
          this.logger.log(
            `📝 User ${userId} disconnected. Remaining connections: ${afterSize} (was ${beforeSize})`,
          );
        }
      }
    } else {
      this.logger.warn(
        `⚠️ Disconnected socket ${client.id} was not associated with any user`,
      );
    }

    this.logger.log(`📊 Total active users: ${userSockets.size}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Send notification to specific user(s)
   */
  async sendNotificationToUsers(userIds: number[], notification: any) {
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log(`📤 SENDING NOTIFICATION`);
    this.logger.log(`Target users: ${userIds.join(", ")}`);
    this.logger.log(`Notification ID: ${notification.id}`);
    this.logger.log(`Title: ${notification.title}`);
    this.logger.log(`Type: ${notification.type}`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const sockets = userSockets.get(userId);
      if (sockets && sockets.size > 0) {
        try {
          // Emit to user's room
          this.server
            .to(`user_${userId}`)
            .emit("new_notification", notification);
          this.logger.log(
            `  ✅ Sent to user ${userId} (${sockets.size} connection(s))`,
          );
          totalSent++;

          // Update unread count
          if (this.notificationsService) {
            try {
              const unreadCount =
                await this.notificationsService.getUnreadCount(userId);
              this.server
                .to(`user_${userId}`)
                .emit("unread_count", { count: unreadCount });
              this.logger.log(
                `  📊 Updated unread count for user ${userId}: ${unreadCount}`,
              );
            } catch (error) {
              this.logger.error(
                `  ❌ Failed to get unread count for user ${userId}: ${error.message}`,
              );
              totalFailed++;
            }
          }
        } catch (error) {
          this.logger.error(
            `  ❌ Failed to send notification to user ${userId}: ${error.message}`,
          );
          totalFailed++;
        }
      } else {
        this.logger.warn(
          `  ⚠️ User ${userId} is not connected (no active sockets)`,
        );
        totalFailed++;
      }
    }

    this.logger.log(
      `📊 Summary: ${totalSent} sent, ${totalFailed} failed/offline`,
    );
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Send notification to a single user
   */
  async sendNotificationToUser(userId: number, notification: any) {
    await this.sendNotificationToUsers([userId], notification);
  }

  /**
   * Mark notification as read via WebSocket
   */
  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ) {
    const userId = client.data?.userId;
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log(`📝 MARK AS READ REQUEST`);
    this.logger.log(`Socket ID: ${client.id}`);
    this.logger.log(`User ID: ${userId || "Unknown"}`);
    this.logger.log(`Notification ID: ${data.notificationId}`);

    try {
      if (!userId) {
        this.logger.warn(`❌ User not authenticated`);
        return { success: false, message: "User not authenticated" };
      }

      if (!this.notificationsService) {
        this.logger.error(`❌ Notifications service not available`);
        return {
          success: false,
          message: "Notifications service not available",
        };
      }

      this.logger.log(
        `🔄 Marking notification ${data.notificationId} as read for user ${userId}...`,
      );
      await this.notificationsService.markAsRead(data.notificationId, userId);
      this.logger.log(`✅ Notification marked as read successfully`);

      // Update unread count
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit("unread_count", { count: unreadCount });
      this.logger.log(`📊 Updated unread count: ${unreadCount}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return { success: true, message: "Notification marked as read" };
    } catch (error) {
      this.logger.error(`❌ Error marking notification as read:`);
      this.logger.error(`  Error: ${error.message}`);
      this.logger.error(`  Stack: ${error.stack}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get unread count
   */
  @SubscribeMessage("get_unread_count")
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = client.data?.userId;
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log(`📊 GET UNREAD COUNT REQUEST`);
    this.logger.log(`Socket ID: ${client.id}`);
    this.logger.log(`User ID: ${userId || "Unknown"}`);

    try {
      if (!userId) {
        this.logger.warn(`❌ User not authenticated`);
        return { success: false, message: "User not authenticated" };
      }

      if (!this.notificationsService) {
        this.logger.error(`❌ Notifications service not available`);
        return {
          success: false,
          message: "Notifications service not available",
        };
      }

      this.logger.log(`🔄 Fetching unread count for user ${userId}...`);
      const count = await this.notificationsService.getUnreadCount(userId);
      this.logger.log(`✅ Unread count: ${count}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return { success: true, count };
    } catch (error) {
      this.logger.error(`❌ Error getting unread count:`);
      this.logger.error(`  Error: ${error.message}`);
      this.logger.error(`  Stack: ${error.stack}`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return { success: false, message: error.message };
    }
  }
}
