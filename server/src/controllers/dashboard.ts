import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ClipboardItemModel } from '../models/ClipboardItem';
import { NotebookModel } from '../models/Notebook';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Run aggregations and counts in parallel
    const [
      totalClips,
      totalNotebooks,
      favoriteClips,
      recentClips,
      clipsByDay
    ] = await Promise.all([
      ClipboardItemModel.countDocuments({ userId }),
      NotebookModel.countDocuments({ userId }),
      ClipboardItemModel.countDocuments({ userId, isFavorite: true }),
      ClipboardItemModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('notebookId', 'name icon color itemCount'),
      // Aggregate clips created in the last 7 days
      ClipboardItemModel.aggregate([
        { 
          $match: { 
            userId: userId,
            createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 6)) } // Last 7 days including today
          } 
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculate clips today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayData = clipsByDay.find(d => d._id === todayStr);
    const clipsToday = todayData ? todayData.count : 0;

    // Fill missing days with 0 for the last 7 days
    const formattedChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // Format like "Mon", "Tue"
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayData = clipsByDay.find(item => item._id === dateStr);
      formattedChartData.push({
        name: dayName,
        date: dateStr,
        clips: dayData ? dayData.count : 0
      });
    }

    res.json({
      totalClips,
      totalNotebooks,
      favoriteClips,
      clipsToday,
      recentClips,
      chartData: formattedChartData
    });
  } catch (error) {
    next(error);
  }
};
