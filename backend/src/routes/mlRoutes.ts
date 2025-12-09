import { Router } from 'express';
import * as mlController from '../controllers/mlController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All ML routes require authentication
router.use(authenticate);

// Duplicate detection
router.get('/duplicates', mlController.findDuplicates);
router.post('/duplicates/delete', mlController.deleteDuplicates);

// File recommendations
router.get('/recommendations/:fileId', mlController.getRecommendations);

// PII scanning
router.post('/scan-pii/:fileId', mlController.scanFileForPII);

// ML statistics
router.get('/stats', mlController.getMLStats);

// OCR text extraction
router.post('/ocr/:fileId', mlController.extractTextOCR);

// File summarization
router.get('/summarize/:fileId', mlController.summarizeFile);

export default router;
