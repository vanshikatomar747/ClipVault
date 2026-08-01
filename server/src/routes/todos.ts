import express from 'express';
import { getTodos, createTodo, updateTodo, deleteTodo, getTodoStats } from '../controllers/todos';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', getTodos);
router.post('/', createTodo);
router.get('/stats', getTodoStats);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

export default router;
