import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import type { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import pool from "./lib/db";

import { logger } from "./lib/winston";
import { config } from "./config";
import v1Routes from "../src/routes/v1/index";

const app = express();

const corsOption: CorsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (
      config.NODE_ENV === "development" ||
      config.WHITELIST_ORIGIN.includes(origin)
    ) {
      callback(null, true);
    } else {
      // Reject request from non-whitelisted origins
      callback(new Error(`${origin} is not allowed by CORS`), false);
      logger.warn(`CORS error: ${origin} is not allowed by CORS`);
    }
  },
  credentials: true, // Enable if you need to send cookies
};

app.use(cors(corsOption));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  compression({
    threshold: 1024, // only compress response larger than 1KB
  })
);

app.use(helmet());

// Test database connection
const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    logger.info("Database connection successful");
  } catch (err) {
    logger.error("Database connection failed:", err);
    throw err;
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testDbConnection();

    // Setup routes
    app.use("/api/v1", v1Routes);

    // Start listening
    app.listen(config.PORT, () => {
      logger.info(`Server running on port: ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await pool.end();
  process.exit(0);
});
