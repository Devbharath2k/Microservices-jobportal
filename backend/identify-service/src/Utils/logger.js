import dotenv from "dotenv";
import winston from "winston";
dotenv.config();

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "info",
  format: winston.format.combine(
   winston.format.colorize(),
   winston.format.timestamp(),
   winston.format.splat(),
   winston.format.simple(),
   winston.format.errors({stack : true }),

  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
        ),
    })
  );
}

export default logger;

