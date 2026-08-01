import express from 'express';
import { getClipboardItems, createClipboardItem, updateClipboardItem, deleteClipboardItem } from '../controllers/clipboardItems';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', getClipboardItems);
router.post('/', createClipboardItem);
router.put('/:id', updateClipboardItem);
router.delete('/:id', deleteClipboardItem);

export default router;
