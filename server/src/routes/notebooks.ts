import express from 'express';
import { getNotebooks, createNotebook, updateNotebook, deleteNotebook } from '../controllers/notebooks';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotebooks);
router.post('/', createNotebook);
router.put('/:id', updateNotebook);
router.delete('/:id', deleteNotebook);

export default router;
