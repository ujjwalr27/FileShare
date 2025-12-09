import { Router } from 'express';
import * as fileController from '../controllers/fileController';
import { authenticate } from '../middlewares/auth';
import { uploadSingle } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// File routes
router.post('/upload', uploadSingle, fileController.uploadFile);
router.get('/', fileController.getFiles);
router.get('/search', fileController.searchFiles);
router.get('/:id', fileController.getFile);
router.get('/:id/download', fileController.downloadFile);
router.delete('/:id', fileController.deleteFile);
router.put('/:id/rename', fileController.renameFile);
router.put('/:id/move', fileController.moveFile);

export default router;
