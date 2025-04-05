import express from 'express';
import Userprofile from '../Controller/userController.js';
import {profilephotoUploader, resumeUpload} from '../Utils/multer.js'
import { Authorization } from '../Middleware/generateToken.js';
const router = express.Router();

router.post('/register', profilephotoUploader, Userprofile.register);
router.post('/login', Userprofile.login);

export default router;