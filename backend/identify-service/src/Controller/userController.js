import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import User from "../Model/userModel.js";
import { AccessToken, Refreshtoken } from "../Middleware/generateToken.js";
import cloudnary from "../Config/cloudnary.js";
import getdatauri from "../Utils/datauri.js";
import transporter from "../Config/nodemailer.js";
import logger from "../Utils/logger.js";

const Userprofile = {
  register: async (req, res) => {
    try {
      const { fname, lname, email, password, role } = req.body;
      if (!fname || !lname || !email || !password || !role) {
        logger.warning("Missing required fields");
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warning("Email already exists");
        return res
          .status(StatusCodes.CONFLICT)
          .json({ message: "Email already exists" });
      }

      let profilephotourl = null;
      if (req.file) {
        const parser = getdatauri(req.file);
        const cloudResponse = await cloudnary.uploader.upload(parser.content, {
          folder: "user_profile_pictures",
        });
        profilephotourl = cloudResponse.secure_url;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        fname,
        lname,
        email,
        password: hashedPassword,
        role,
        profile: {
          profilephoto: profilephotourl,
        },
      });

      await user.save();
      logger.info("User registered successfully");
      res
        .status(StatusCodes.CREATED)
        .json({ message: "User registered successfully", user });

    } catch (error) {
      logger.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password, role } = req.body;
      if (!email || !password || !role) {
        logger.warning("Missing required fields");
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        logger.warning("User not found");
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warning("Incorrect password");
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "Incorrect password" });
      }

      if (user.role !== role) {
        logger.warning("Incorrect role");
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Incorrect role" });
      }

      if (user.status !== "active") {
        logger.warning("User account is inactive");
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "User account is inactive" });
      }

      const accessToken = await AccessToken(user._id);
      const refreshToken = await Refreshtoken(user._id);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      };

      res.cookie("access-token", accessToken, cookieOptions);
      res.cookie("refresh-token", refreshToken, cookieOptions);

      logger.info("User logged in successfully");
      res.status(StatusCodes.ACCEPTED).json({
        message: `Welcome back ${user.fname} ${user.lname}`,
        accessToken,
        refreshToken,
        user,
      });

    } catch (error) {
      logger.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  },
};

export default Userprofile;
