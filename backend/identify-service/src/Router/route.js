import express from "express";
import multer from "multer";
import Userprofile from "../Controller/userController.js";

const router = express.Router();
const upload = multer(); // Use memory storage if sending to Cloudinary directly

router.post("/v1/register", upload.single("profilephoto"), Userprofile.register);
router.post("/v1/login", Userprofile.login);

export default router;
