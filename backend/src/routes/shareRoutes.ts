import { Router } from 'express';
import * as shareController from '../controllers/shareController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/public/:token', shareController.getPublicShare);
router.get('/public/:token/download', shareController.downloadSharedFile);

// Protected routes (authentication required)
router.use(authenticate);

// Share management routes
router.post('/', shareController.createShare);
router.get('/', shareController.getUserShares);
router.get('/file/:fileId', shareController.getFileShares);
router.put('/:id', shareController.updateShare);
router.delete('/:id', shareController.deleteShare);
router.post('/:id/revoke', shareController.revokeShare);

export default router;
