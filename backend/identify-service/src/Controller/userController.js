import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import User from "../Model/userModel.js";
import { AccessToken, Refreshtoken } from "../Middleware/generateToken.js";
import cloudnary from "../Config/cloudnary.js";
import getdatauri from "../Utils/datauri.js";
import transporter from "../Config/nodemailer.js";
import generate from "../Utils/generateOtp.js";
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

      if (user.isstatus !== "active") {
        logger.warn("User account is inactive");
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

      res.cookie("Accesstoken", accessToken, cookieOptions);
      res.cookie("Refreshtoken", refreshToken, cookieOptions);

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
  updateprofile: async (req, res) => {
    try {
      const {
        fname,
        lname,
        email,
        bio,
        phone,
        skills,
        location,
        education,
        projects,
      } = req.body;
      const userId = req.user;
      const user = await User.findById(userId);
      if (!user) {
        logger.warning("User not found");
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found" });
      }
      let skillsArray = skills ? skills.split(",") : [];
      let educationArray = education ? education.split(",") : [];
      let projectsArray = projects ? projects.split(",") : [];

      let resumeurl = null;
      let originalnameurl = null;
      const file = req.file;
      if (!file) {
        const parser = getdatauri(file);
        const cloudResponse = await cloudnary.uploader.upload(parser.content, {
          folder: "user_resume_pictures",
        });
        resumeurl = cloudResponse.secure_url;
        originalnameurl = cloudResponse.original_filename;
      }
      if (fname) user.fname = fname;
      if (lname) user.lname = lname;
      if (email) user.email = email;
      if (bio) user.profile.bio = bio;
      if (phone) user.phone = phone;
      if (skillsArray.length) user.profile.skills = skillsArray;
      if (location) user.profile.location = location;
      if (educationArray.length) user.profile.education = educationArray;
      if (projectsArray.length) user.profile.projects = projectsArray;
      if (resumeurl) user.profile.resume = resumeurl;
      if (file) user.profile.resume = originalnameurl;

      await user.save();
      logger.info("User profile updated successfully");
      res
        .status(StatusCodes.ACCEPTED)
        .json({ message: "User profile updated successfully", user });
    } catch (error) {
      logger.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "internal server error",
        success: false,
      });
    }
  },
  forgotpassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
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
      const otp = await generate();
      const expiryTime = new Date() + 60 * 1000 * 5; // 5 minutes expiry

      user.forgot_password_otp = otp;
      user.forgot_password_otp_expiry = expiryTime;
      await user.save();

      const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: user.email,
        subject: "Reset Password OTP",
        text: `Your OTP is ${otp}. This OTP will expire in 5 minutes.`,
      };
      logger.info(`OTP sent to ${email}`);
      await transporter.sendMail(
        mailOptions((error, info) => {
          if (error) {
            logger.error(`Error sending OTP to ${email}: ${error}`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              message: "Failed to send OTP",
              success: false,
            });
          }
          logger.info(`OTP sent to ${email}`);
          return res.status(StatusCodes.ACCEPTED).json({
            message: "OTP sent successfully",
            success: true,
          });
        })
      );
      return res.status(StatusCodes.ACCEPTED).json({
        message: "OTP sent successfully",
        success: true,
      });
    } catch (error) {
      logger.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "internal server error",
        success: false,
      });
    }
  },
  verfiypassword: async (req, res) => {
    try {
      const { otp, email } = req.body;
      if (!otp || !email) {
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
      const currentTime = new Date();
      if (
        !user.forgot_password_otp_expiry ||
        currentTime > user.forgot_password_otp_expiry
      ) {
        logger.warning("OTP expired");
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "OTP expired" });
      }
      if (user.forgot_password_otp !== otp) {
        logger.warning("Incorrect OTP");
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Incorrect OTP" });
      }
      user.forgot_password_otp = null;
      user.forgot_password_otp_expiry = null;
      await user.save();
      logger.info(`Password reset for ${email}`);
      return res.status(StatusCodes.ACCEPTED).json({
        message: "Password reset successfully",
        success: true,
      });
    } catch (error) {
      logger.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "internal server error",
        success: false,
      });
    }
  },
  resetpassword: async (req, res) => {
    try {
      const { email, password, confirmpassword } = req.body;
      if (!email || !password || !confirmpassword) {
        logger.warning("Missing required fields");
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Missing required fields" });
      }
      let user = await User.findOne({ email });
      if (!user) {
        logger.warning("User not found");
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "User not found" });
      }
      if (password !== confirmpassword) {
        logger.warning("Passwords do not match");
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Passwords do not match" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();
      logger.info(`Password reset for ${email}`);
      return res.status(StatusCodes.ACCEPTED).json({
        message: "Password reset successfully",
        success: true,
      });
    } catch (error) {
      logger.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "internal server error",
        success: false,
      });
    }
  },
  logout: async (req, res) => {
    try {
      const userId = req.user;
      const user = await User.findById(userId);
      if (!user) {
        logger.warning("User not found");
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ message: "User not found" });
      }
      res.clearCookie("accesstoken", AccessToken);
      res.clearCookie("refreshtoken", Refreshtoken);

      logger.info("User logged out successfully");
      res.status(StatusCodes.ACCEPTED).json({
        message: "User logged out successfully",
      });
    } catch (error) {
      logger.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "internal server error",
        success: false,
      });
    }
  },
};

export default Userprofile;
