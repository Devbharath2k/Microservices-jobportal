import express from "express";
import Userprofile from "../Controller/userController.js";
import { profilephotoUploader } from "../Utils/multer.js";
import { Authorization } from "../Middleware/generateToken.js";
import { resumeUpload } from "../Utils/multer.js";

const router = express.Router();

router.post("/v1/register", profilephotoUploader, Userprofile.register);
router.post("/v1/login", Userprofile.login);
router.post('/v1/update', resumeUpload, Authorization, Userprofile.updateprofile);
router.post('/v1/forgotpassword', Userprofile.forgotpassword);
router.post('/v1/verfiypassword', Userprofile.verfiypassword);
router.post('/v1/resetpassword', Userprofile.resetpassword)
router.post('/v1/logout', Authorization, Userprofile.logout);


export default router;
