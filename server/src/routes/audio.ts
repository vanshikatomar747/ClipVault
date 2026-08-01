import express from 'express';
import { requireAuth } from '../middleware/auth';
import { getAudioHistory, deleteAudioHistory } from '../controllers/audio';

const router = express.Router();

router.get('/', requireAuth, getAudioHistory);
router.delete('/:id', requireAuth, deleteAudioHistory);

export default router;
