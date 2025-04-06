import User from "../Model/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import logger from "../Utils/logger.js";
import { StatusCodes } from "http-status-codes";

dotenv.config();

const AccessToken = async (userId) => {
  try {
    const token = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    return token;
  } catch (error) {
    logger.error(error);
    throw new Error("Failed to generate access token");
  }
};

const Refreshtoken = async (userId) => {
  try {
    const token = jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    const updatetoken = await User.updateOne(
      { _id: userId },
      {
        refresh_token: token,
      }
    );
    return token;
  } catch (error) {
    logger.error(error);
    throw new Error("Failed to generate refresh token");
  }
};

const Authorization = async (req, res, next) => {
  try {
    const token =
      req.cookies.Accesstoken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("No token found");
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token found" });
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded) {
      logger.warn("Invalid token");
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
    }
    req.user = decoded.id;
    next();
  } catch (error) {
    logger.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Invalid token" });
  }
};

export { AccessToken, Refreshtoken, Authorization };
