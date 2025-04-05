import multer from 'multer';

const storage = multer.memoryStorage();

const profilephotoUploader = multer({storage}).single('profilephoto');

const resumeUpload = multer({storage}).single('resume');

export { profilephotoUploader, resumeUpload };