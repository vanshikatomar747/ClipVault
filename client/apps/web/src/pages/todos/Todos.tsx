import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { CheckCircle2, Circle, Plus, Trash2, CalendarDays, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { format, subDays, addDays, startOfDay } from 'date-fns';
import { useOutletContext } from 'react-router-dom';
import { getTodos, createTodo, updateTodo, deleteTodo, getTodoStats } from '../../api/todos';
import type { Todo } from '../../api/todos';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function Todos() {
  const { isDarkMode } = useOutletContext<{ isDarkMode: boolean }>();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [calendarStats, setCalendarStats] = useState<Record<string, { total: number; completed: number }>>({});
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, [selectedDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString();
      const data = await getTodos(dateStr, dateStr);
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = startOfDay(new Date());
      const calStartDate = subDays(today, 90);
      const calEndDate = addDays(today, 90);
      const tzOffset = new Date().getTimezoneOffset();

      const statsData = await getTodoStats(calStartDate.toISOString(), calEndDate.toISOString(), tzOffset);
      setCalendarStats(statsData);

      const formattedStats = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayStat = statsData[dateStr] || { total: 0, completed: 0 };
        formattedStats.push({
          name: format(d, 'EEE'),
          completed: dayStat.completed,
          total: dayStat.total
        });
      }
      setStats(formattedStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const newTodo = await createTodo({
        title: newTaskTitle,
        priority: newTaskPriority,
        date: selectedDate.toISOString()
      });
      setTodos([newTodo, ...todos]);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      fetchStats(); // Update stats
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const updated = await updateTodo(todo._id, { isCompleted: !todo.isCompleted });
      setTodos(todos.map(t => t._id === updated._id ? updated : t));
      fetchStats();
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(t => t._id !== id));
      fetchStats();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return isDarkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-600 border-red-200';
      case 'medium': return isDarkMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'low': return isDarkMode ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-600 border-green-200';
      default: return isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const onDateChange = (val: Value) => {
    if (val instanceof Date) {
      setSelectedDate(startOfDay(val));
    }
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayStat = calendarStats[dateStr];
      if (dayStat && dayStat.total > 0) {
        // If all tasks are completed, make it a checkmark-green dot, otherwise standard olive
        const isAllCompleted = dayStat.completed === dayStat.total;
        return <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${isAllCompleted ? 'bg-green-500' : 'bg-cv-olive'}`} />;
      }
    }
    return null;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pt-6 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-cv-brown'}`}>
          <CalendarDays className="w-8 h-8 text-cv-sage" />
          Task Calendar
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calendar & Stats */}
        <div className="space-y-6">
          <div className={`rounded-2xl p-6 shadow-soft transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>Select Date</h3>
            <div className={`calendar-container ${isDarkMode ? 'dark-calendar' : ''}`}>
              <Calendar
                onChange={onDateChange}
                value={selectedDate}
                tileContent={tileContent}
                className={`w-full border-none bg-transparent font-sans ${isDarkMode ? 'text-white' : ''}`}
              />
            </div>
          </div>

          <div className={`rounded-2xl p-6 shadow-soft h-[300px] flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>
              <TrendingUp className="w-5 h-5 text-cv-sage" />
              Completion Tracker
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 25, right: 10, left: -20, bottom: 10 }} barGap={8} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDarkMode ? '#FDE68A' : '#D4A373'} stopOpacity={1} />
                      <stop offset="95%" stopColor={isDarkMode ? '#D97706' : '#A97C50'} stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDarkMode ? '#A7F3D0' : '#A8C3A0'} stopOpacity={1} />
                      <stop offset="95%" stopColor={isDarkMode ? '#059669' : '#738F6D'} stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#3f3f46' : '#E5E7EB'} opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#a1a1aa' : '#7E9D76', fontSize: 13, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#a1a1aa' : '#7E9D76', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                      boxShadow: '0 8px 30px -10px rgba(0,0,0,0.15)',
                      backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(8px)',
                      color: isDarkMode ? '#fff' : '#1f2937',
                      fontSize: '12px',
                      padding: '6px 10px'
                    }}
                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingBottom: '10px' }} />
                  <Bar dataKey="total" name="Total Tasks" fill="url(#colorTotal)" radius={[6, 6, 6, 6]} barSize={16} animationDuration={1500} animationEasing="ease-out">
                    <LabelList dataKey="total" position="top" fill={isDarkMode ? '#FDE68A' : '#D97706'} fontSize={12} fontWeight="bold" />
                  </Bar>
                  <Bar dataKey="completed" name="Completed Tasks" fill="url(#colorCompleted)" radius={[6, 6, 6, 6]} barSize={16} animationDuration={1500} animationEasing="ease-out">
                    <LabelList dataKey="completed" position="top" fill={isDarkMode ? '#A7F3D0' : '#059669'} fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Task List */}
        <div className="lg:col-span-2 flex flex-col h-auto lg:h-[calc(100vh-12rem)] min-h-[400px] lg:min-h-[600px]">
          <div className={`rounded-2xl p-6 shadow-soft flex-1 flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-cv-brown'}`}>
              Tasks for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>

            <form onSubmit={handleAddTodo} className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 mt-4">
              <input
                type="text"
                placeholder="What to do?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className={`flex-1 px-4 py-2 border rounded-xl focus:ring-cv-sage focus:border-cv-sage transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400' : 'bg-white/50 border-zinc-200 text-zinc-900 placeholder-zinc-300'}`}
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className={`px-4 py-2 border rounded-xl focus:ring-cv-sage focus:border-cv-sage text-sm font-medium outline-none transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white/50 border-zinc-200 text-zinc-900'}`}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="p-2.5 bg-cv-sage text-white rounded-xl hover:bg-cv-olive transition-colors disabled:opacity-50 flex items-center justify-center sm:w-auto"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            <div className="flex-1 overflow-auto space-y-3">
              {isLoading ? (
                <div className={`text-center py-10 ${isDarkMode ? 'text-zinc-500' : 'text-cv-olive'}`}>Loading tasks...</div>
              ) : todos.length === 0 ? (
                <div className={`text-center py-10 flex flex-col items-center ${isDarkMode ? 'text-zinc-500' : 'text-cv-olive'}`}>
                  <CheckCircle2 className={`w-12 h-12 mb-3 ${isDarkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                  <p>No tasks for this day. You're all caught up!</p>
                </div>
              ) : (
                todos.map(todo => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={todo._id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-zinc-900/50 border-transparent hover:border-zinc-700' : 'bg-white/50 border-transparent hover:border-zinc-200'} ${todo.isCompleted ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button onClick={() => handleToggleTodo(todo)} className="text-cv-sage hover:text-cv-olive focus:outline-none">
                        {todo.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                      <span className={`flex-1 font-medium ${todo.isCompleted ? 'line-through text-zinc-500' : (isDarkMode ? 'text-zinc-200' : 'text-zinc-800')}`}>
                        {todo.title}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(todo.priority)}`}>
                        {todo.priority.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo._id)}
                      className={`ml-4 p-2 rounded-lg transition-colors focus:outline-none ${isDarkMode ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
