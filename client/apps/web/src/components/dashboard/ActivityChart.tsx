import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ActivityChartProps {
  data: { name: string; clips: number }[];
  isDarkMode?: boolean;
}

export default function ActivityChart({ data, isDarkMode }: ActivityChartProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-soft h-[350px] flex flex-col transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-cv-cream'}`}>
      <h3 className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>Weekly Activity</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#3f3f46' : '#E5E7EB'} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#a1a1aa' : '#7E9D76', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#a1a1aa' : '#7E9D76', fontSize: 12 }} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)', backgroundColor: isDarkMode ? '#18181b' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
              cursor={{ fill: isDarkMode ? '#27272a' : '#f4f4f5' }}
            />
            <Bar dataKey="clips" name="Clips Saved" fill="#A8C3A0" radius={[6, 6, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
