import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import logger from "./Utils/logger.js";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import HandlerDatabaseConnection from "./Config/db.js";
import router from "./Router/route.js";
import multer from "multer"; // If using file uploads (needed for req.file)

const app = express();
const port = process.env.PORT;

// Initialize Redis
const redisClient = new Redis(process.env.REDIS_URL);

// --- MIDDLEWARE ORDER MATTERS --- //

// 1. Security
app.use(helmet());

// 2. Body parsers (only use express.json + express.urlencoded)
app.use(express.json()); // Handles application/json
app.use(express.urlencoded({ extended: true })); // Handles application/x-www-form-urlencoded

// ❌ REMOVE this: `bodyParser.json()` is redundant and can cause conflicts
// app.use(bodyParser.json());

// 3. Cookie parser
app.use(cookieParser());

// 4. CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 201,
  })
);

// 5. Rate Limiting (global + sensitive)
const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // 10 requests
  duration: 1, // per second
});

app.use(async (req, res, next) => {
  try {
    await globalRateLimiter.consume(req.ip);
    next();
  } catch (err) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({ success: false, message: "Too many requests" });
  }
});

// 6. Logger — ✅ Now it will see `req.body` correctly
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.originalUrl}`);
  logger.info("Request body:", req.body); // Show object directly
  next();
});

// 7. Sensitive Endpoints Limiter
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/v1/register", sensitiveEndpointsLimiter);
app.use("/api/v1/login", sensitiveEndpointsLimiter);

// 8. Routes
app.use("/api", router);

// 9. Server Start
app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port}`);
  HandlerDatabaseConnection();
});
