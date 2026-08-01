import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TodoModel } from '../models/Todo';

export const getTodos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;

    let query: any = { userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    } else if (startDate) {
      const start = new Date(startDate as string);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(startDate as string);
      end.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const todos = await TodoModel.find(query).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    next(error);
  }
};

export const createTodo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, priority, date } = req.body;
    const userId = req.user?.id;

    if (!title || !date) {
      res.status(400).json({ message: 'Title and date are required' });
      return;
    }

    const todo = await TodoModel.create({
      userId,
      title,
      priority: priority || 'medium',
      date: new Date(date),
    });

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
};

export const updateTodo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    const todo = await TodoModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!todo) {
      res.status(404).json({ message: 'Todo not found' });
      return;
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const todo = await TodoModel.findOneAndDelete({ _id: id, userId });

    if (!todo) {
      res.status(404).json({ message: 'Todo not found' });
      return;
    }

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTodoStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, tzOffset } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Start and end date are required' });
      return;
    }

    const todos = await TodoModel.find({
      userId,
      date: {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      },
    });

    const offsetMinutes = tzOffset ? Number(tzOffset) : 0;

    // Group by date string YYYY-MM-DD
    const stats: Record<string, { total: number; completed: number }> = {};
    
    todos.forEach((todo) => {
      const adjustedDate = new Date(todo.date.getTime() - offsetMinutes * 60000);
      const dateStr = adjustedDate.toISOString().split('T')[0];
      
      if (!stats[dateStr]) {
        stats[dateStr] = { total: 0, completed: 0 };
      }
      stats[dateStr].total += 1;
      if (todo.isCompleted) {
        stats[dateStr].completed += 1;
      }
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};
