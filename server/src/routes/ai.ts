import express from 'express';
import { checkStatus, generateSummary, generateSelectionSummary, getSummaries, deleteSummary } from '../controllers/ai';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/status', checkStatus);
router.post('/summarize', generateSummary);
router.post('/summarize-selection', generateSelectionSummary);
router.get('/summaries', getSummaries);
router.delete('/summaries/:id', deleteSummary);

export default router;
