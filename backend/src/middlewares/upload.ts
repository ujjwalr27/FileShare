import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config';
import { generateUniqueFilename } from '../utils/helpers';

// Ensure upload directory exists
if (!fs.existsSync(config.upload.uploadDir)) {
  fs.mkdirSync(config.upload.uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if mime type is allowed
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10, // Max 10 files per request
  },
});

// Single file upload
export const uploadSingle = upload.single('file');

// Multiple files upload
export const uploadMultiple = upload.array('files', 10);
