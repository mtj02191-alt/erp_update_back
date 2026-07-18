import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure WebSocket adapter for Socket.IO
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔌 Initializing Socket.IO WebSocket adapter...");
  app.useWebSocketAdapter(new IoAdapter(app));
  console.log("✅ Socket.IO adapter configured successfully");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Define allowed origins (normalized - no trailing slashes, lowercase)
  const allowedOrigins = [
    "http://localhost:5173", // Local development
    "http://127.0.0.1:5173", // Local development alternative
    "http://localhost:3001", // Special origin - bypasses JWT authentication (see ConditionalJwtGuard)
    "http://localhost:3000",
    "https://donation.mtjfoundation.org",
    "http://31.97.223.158:8081",
    "https://mtjf-erp.vercel.app",
    "http://localhost:3002",
    "http://192.168.0.106:5173",
    "https://mtjf-site.vercel.app",
    "https://www.mtjfoundation.org",
    "http://192.168.2.131:3001",
    "https://mtjfoundation.org", // Add non-www version
    "http://18.143.123.75", // EOceans IP - add protocol
    "https://18.143.123.75", // EOceans IP - HTTPS version
    "https://erp.mtjfoundation.pk",
  ];

  // Normalize origin for comparison (remove trailing slash, convert to lowercase)
  const normalizeOrigin = (origin: string): string => {
    return origin.toLowerCase().replace(/\/$/, "");
  };

  // Stripe webhook needs raw body for signature verification; all other routes use JSON
  app.use((req, res, next) => {
    if (req.originalUrl === "/donations/public/stripe/webhook") {
      return bodyParser.raw({ type: "application/json" })(req, res, next);
    }
    return bodyParser.json({ limit: "10mb" })(req, res, next);
  });
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log("No origin header - allowing request");
        return callback(null, true);
      }

      // Normalize the incoming origin
      const normalizedOrigin = normalizeOrigin(origin);

      // During development, allow all localhost origins
      if (
        process.env.NODE_ENV !== "production" &&
        (normalizedOrigin.startsWith("http://localhost:") ||
          normalizedOrigin.startsWith("http://127.0.0.1:") ||
          normalizedOrigin.startsWith("http://192.168.2.131:"))
      ) {
        console.log("Development mode: Allowing origin:", origin);
        return callback(null, true);
      }

      // Check if normalized origin matches any allowed origin (normalized)
      const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);
      const isAllowedOrigin =
        normalizedAllowedOrigins.includes(normalizedOrigin);

      if (isAllowedOrigin) {
        console.log(
          "✅ Allowed origin:",
          origin,
          "(normalized:",
          normalizedOrigin + ")",
        );
        callback(null, true);
      } else {
        console.log(
          "❌ Blocked by CORS:",
          origin,
          "(normalized:",
          normalizedOrigin + ")",
        );
        console.log("Allowed origins:", normalizedAllowedOrigins);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
      "Cookie",
    ],
    exposedHeaders: ["Set-Cookie", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Add a middleware to log all requests
  app.use((req, res, next) => {
    console.log("Incoming request:", {
      method: req.method,
      url: req.url,
      // origin: req.headers.origin,
      // headers: req.headers
    });
    next();
  });

  app.use(cookieParser());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log("Allowed origins:", allowedOrigins);
}
bootstrap();
