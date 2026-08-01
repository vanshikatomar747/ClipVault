import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Book, Clock, Star, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardStats } from '../../api/dashboard';
import { deleteClipboardItem } from '../../api/clipboard';
import StatCard from '../../components/dashboard/StatCard';
import ActivityChart from '../../components/dashboard/ActivityChart';
import MoveNotebookDropdown from '../../components/MoveNotebookDropdown';
import { formatDistanceToNow } from 'date-fns';
import { useOutletContext } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { isDarkMode, socket } = useOutletContext<{ isDarkMode: boolean; socket: any }>();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  useEffect(() => {
    if (!socket) return;

    const handleClipChange = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    };

    socket.on('new_clipboard_item', handleClipChange);
    socket.on('update_clipboard_item', handleClipChange);
    socket.on('delete_clipboard_item', handleClipChange);

    return () => {
      socket.off('new_clipboard_item', handleClipChange);
      socket.off('update_clipboard_item', handleClipChange);
      socket.off('delete_clipboard_item', handleClipChange);
    };
  }, [socket, queryClient]);

  if (isLoading || !stats) {
    return <div className={`p-8 ${isDarkMode ? 'text-zinc-500' : 'text-cv-olive'}`}>Loading dashboard...</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto space-y-8 pt-6 pb-10 px-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-center justify-between">
        <motion.h1 variants={itemVariants} className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-cv-brown'}`}>
          Overview
        </motion.h1>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Clips" value={stats.totalClips.toString()} icon={Copy} trend={{ value: stats.clipsToday, isPositive: true }} isDarkMode={isDarkMode} />
        <StatCard title="Notebooks" value={stats.totalNotebooks.toString()} icon={Book} isDarkMode={isDarkMode} />
        <StatCard title="Clips Today" value={stats.clipsToday.toString()} icon={Clock} trend={{ value: stats.clipsToday, isPositive: true }} isDarkMode={isDarkMode} />
        <StatCard title="Favorites" value={stats.favoriteClips.toString()} icon={Star} isDarkMode={isDarkMode} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={stats.chartData} isDarkMode={isDarkMode} />
        </div>

        <div className={`rounded-2xl p-6 shadow-soft flex flex-col max-h-[400px] transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>Recent Clips</h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {stats.recentClips && stats.recentClips.length > 0 ? (
              stats.recentClips.map((clip: any) => (
                <div key={clip._id} className={`group relative p-3 rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-transparent hover:border-zinc-700' : 'bg-white/60 border-zinc-100 hover:border-cv-olive'}`}>
                  <p className={`text-sm font-medium line-clamp-2 mb-2 pr-12 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{clip.text.replace(/<[^>]*>?/gm, '')}</p>
                  <div className={`flex items-center justify-between text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    {clip.notebookId ? (
                      <span className="group/tooltip relative flex items-center gap-1 cursor-help">
                        {clip.notebookId.icon} {clip.notebookId.name}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max min-w-[120px] p-2 bg-zinc-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-lg z-50 pointer-events-none">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: clip.notebookId.color || '#A8C3A0' }} />
                            <span className="font-bold">{clip.notebookId.name}</span>
                          </div>
                          <p className="text-zinc-300 ml-5">{clip.notebookId.itemCount || 0} texts</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
                        </div>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 opacity-60">
                        <Book className="w-3.5 h-3.5" /> Not Assigned
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })}</span>
                  </div>

                  {/* Actions (Always visible) */}
                  <div className={`absolute top-2 right-2 flex flex-row gap-1 rounded-lg p-1 shadow-sm backdrop-blur-sm ${isDarkMode ? 'bg-zinc-800/90' : 'bg-white/90'}`}>
                    <button
                      onClick={async () => {
                        try {
                          await deleteClipboardItem(clip._id);
                          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`p-1 rounded-lg transition-colors shadow-sm ${isDarkMode ? 'bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-red-500/20' : 'bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}
                      title="Delete clip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <MoveNotebookDropdown itemIds={[clip._id]} currentNotebookId={clip.notebookId?._id} />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-zinc-400 text-sm">No recent clips found.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
