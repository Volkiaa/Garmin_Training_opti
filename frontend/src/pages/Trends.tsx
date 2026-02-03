import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MorphingCard } from '../components/morphic/MorphingCard';
import { FluidButton } from '../components/morphic/FluidButton';
import { RefreshCw, TrendingUp, Calendar, Activity, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fadeInUp, staggerContainer, staggerItem, smoothSpring } from '../lib/animations';

interface WeeklyMetric {
  week_start: string;
  week_end: string;
  total_volume_hours: number;
  total_load: number;
  volume_by_discipline: Record<string, number>;
  intensity_distribution: Record<string, number>;
  avg_readiness: number;
  avg_hrv: number;
  avg_sleep_hours: number;
  avg_acwr: number;
  activity_count: number;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  hyrox: '#3b82f6',
  strength: '#10b981',
  run: '#f59e0b',
  bike: '#ef4444',
  swim: '#8b5cf6',
  other: '#6b7280',
};

export function Trends() {
  const [weeks, setWeeks] = useState(12);

  const { data: weeklyData, isLoading, refetch } = useQuery({
    queryKey: ['trends', weeks],
    queryFn: async () => {
      const res = await fetch(`/api/v1/trends/weekly?weeks=${weeks}`);
      const json = await res.json();
      return json.weeks as WeeklyMetric[];
    },
  });

  const handleAggregate = async () => {
    await fetch('/api/v1/trends/aggregate', { method: 'POST' });
    refetch();
  };

  // Transform data for charts
  const chartData = weeklyData?.map((week) => ({
    ...week,
    weekLabel: format(parseISO(week.week_start), 'MMM d'),
    weekStart: week.week_start,
  })) || [];

  // Calculate discipline totals
  const disciplineTotals = weeklyData?.reduce((acc, week) => {
    Object.entries(week.volume_by_discipline || {}).forEach(([discipline, hours]) => {
      acc[discipline] = (acc[discipline] || 0) + hours;
    });
    return acc;
  }, {} as Record<string, number>) || {};

  const disciplineData = Object.entries(disciplineTotals)
    .filter(([_, hours]) => hours > 0)
    .map(([name, value]) => ({ name, value, color: DISCIPLINE_COLORS[name] || '#6b7280' }));

  // Calculate summary stats
  const totalVolume = weeklyData?.reduce((sum, w) => sum + (w.total_volume_hours || 0), 0) || 0;
  const totalLoad = weeklyData?.reduce((sum, w) => sum + (w.total_load || 0), 0) || 0;
  const totalActivities = weeklyData?.reduce((sum, w) => sum + (w.activity_count || 0), 0) || 0;
  const avgReadiness = weeklyData && weeklyData.length > 0
    ? weeklyData.reduce((sum, w) => sum + (w.avg_readiness || 0), 0) / weeklyData.length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        variants={staggerItem}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Trends
          </h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex gap-1 bg-white/5 backdrop-blur-sm p-1 rounded-xl border border-white/10">
            {[4, 8, 12].map((w) => (
              <FluidButton
                key={w}
                variant={weeks === w ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setWeeks(w)}
                className={weeks === w ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'text-gray-400'}
              >
                {w}W
              </FluidButton>
            ))}
          </div>
          <FluidButton
            variant="ghost"
            size="sm"
            onClick={handleAggregate}
            className="text-gray-400 border-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </FluidButton>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerItem}
      >
        <MorphingCard glowColor="blue">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalVolume.toFixed(1)}h</p>
          <p className="text-xs text-gray-500">{weeks} weeks</p>
        </MorphingCard>

        <MorphingCard glowColor="emerald">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm">Total Load</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalLoad.toFixed(0)}</p>
          <p className="text-xs text-gray-500">Training stress</p>
        </MorphingCard>

        <MorphingCard glowColor="amber">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-sm">Activities</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalActivities}</p>
          <p className="text-xs text-gray-500">{(totalActivities / weeks).toFixed(1)}/week avg</p>
        </MorphingCard>

        <MorphingCard glowColor="purple">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm">Avg Readiness</span>
          </div>
          <p className={`text-2xl font-bold ${avgReadiness >= 70 ? 'text-emerald-400' : avgReadiness >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {avgReadiness.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">Out of 100</p>
        </MorphingCard>
      </motion.div>

      {/* Volume & Load Trend Chart */}
      <motion.div variants={staggerItem}>
        <MorphingCard>
          <h3 className="text-lg font-semibold text-white mb-4">Volume & Load Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="weekLabel"
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis yAxisId="left" stroke="#60a5fa" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_volume_hours"
                  name="Volume (hours)"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: '#60a5fa', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: '#60a5fa', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_load"
                  name="Training Load"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ fill: '#34d399', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: '#34d399', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MorphingCard>
      </motion.div>

      {/* Readiness & HRV Chart */}
      <motion.div variants={staggerItem}>
        <MorphingCard>
          <h3 className="text-lg font-semibold text-white mb-4">Readiness & Recovery Metrics</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="weekLabel" stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#a78bfa" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_readiness"
                  name="Readiness Score"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ fill: '#a78bfa', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: '#a78bfa', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avg_hrv"
                  name="HRV (ms)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ fill: '#fbbf24', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: '#fbbf24', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MorphingCard>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discipline Breakdown */}
        <motion.div variants={staggerItem}>
          <MorphingCard>
            <h3 className="text-lg font-semibold text-white mb-4">Volume by Discipline</h3>
            {disciplineData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={disciplineData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {disciplineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No discipline data available
              </div>
            )}
          </MorphingCard>
        </motion.div>

        {/* Weekly Breakdown Table */}
        <motion.div variants={staggerItem}>
          <MorphingCard>
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Breakdown</h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1f2937]">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 font-medium text-gray-400">Week</th>
                    <th className="text-right py-2 font-medium text-gray-400">Volume</th>
                    <th className="text-right py-2 font-medium text-gray-400">Load</th>
                    <th className="text-right py-2 font-medium text-gray-400">Acts</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData?.map((week) => (
                    <tr key={week.week_start} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 text-gray-300">
                        {format(parseISO(week.week_start), 'MMM d')}
                      </td>
                      <td className="text-right py-2 text-gray-300">{week.total_volume_hours?.toFixed(1)}h</td>
                      <td className="text-right py-2 text-gray-300">{week.total_load?.toFixed(0)}</td>
                      <td className="text-right py-2 text-gray-300">{week.activity_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MorphingCard>
        </motion.div>
      </div>

      {/* Activity Count Bar Chart */}
      <motion.div variants={staggerItem}>
        <MorphingCard>
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity Count</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="weekLabel" stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar
                  dataKey="activity_count"
                  name="Activities"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}
