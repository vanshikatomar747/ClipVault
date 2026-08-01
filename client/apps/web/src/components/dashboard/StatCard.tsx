import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  isDarkMode?: boolean;
}

export default function StatCard({ title, value, icon: Icon, trend, isDarkMode }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`rounded-2xl p-6 shadow-soft transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-zinc-400' : 'text-cv-olive'}`}>{title}</h3>
        <div className={`p-2 rounded-xl shadow-sm transition-colors ${isDarkMode ? 'bg-zinc-900 text-cv-sage' : 'bg-white text-cv-sage'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-cv-brown'}`}>{value}</h2>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.isPositive 
              ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
              : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
          }`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
