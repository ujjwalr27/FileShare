import { Router } from 'express';
import * as folderController from '../controllers/folderController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Folder routes
router.post('/', folderController.createFolder);
router.get('/', folderController.getFolders);
router.get('/:id', folderController.getFolder);
router.get('/:id/contents', folderController.getFolderContents);
router.get('/:id/breadcrumb', folderController.getFolderBreadcrumb);
router.put('/:id/rename', folderController.renameFolder);
router.put('/:id/move', folderController.moveFolder);
router.delete('/:id', folderController.deleteFolder);

export default router;
