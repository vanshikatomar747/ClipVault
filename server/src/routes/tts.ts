import express from 'express';
import { requireAuth } from '../middleware/auth';
import { generateNotebookTTS, generateSelectionTTS } from '../controllers/tts';

const router = express.Router();

router.post('/generate', requireAuth, generateNotebookTTS);
router.post('/selection', requireAuth, generateSelectionTTS);

export default router;
