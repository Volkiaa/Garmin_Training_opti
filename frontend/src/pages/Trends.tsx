import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, TrendingUp, Calendar, Activity } from 'lucide-react';
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
import { format, parseISO, subWeeks, startOfWeek } from 'date-fns';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[4, 8, 12].map((w) => (
              <Button
                key={w}
                variant={weeks === w ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setWeeks(w)}
              >
                {w}W
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleAggregate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Total Volume</span>
            </div>
            <p className="text-2xl font-bold">{totalVolume.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">{weeks} weeks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Load</span>
            </div>
            <p className="text-2xl font-bold">{totalLoad.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Training stress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Activities</span>
            </div>
            <p className="text-2xl font-bold">{totalActivities}</p>
            <p className="text-xs text-gray-500">{(totalActivities / weeks).toFixed(1)}/week avg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Avg Readiness</span>
            </div>
            <p className={`text-2xl font-bold ${avgReadiness >= 70 ? 'text-green-600' : avgReadiness >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {avgReadiness.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">Out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume & Load Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume & Load Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="total_volume_hours" 
                  name="Volume (hours)" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="total_load" 
                  name="Training Load" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Readiness & HRV Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Readiness & Recovery Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="weekLabel" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#8b5cf6" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avg_readiness" 
                  name="Readiness Score" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avg_hrv" 
                  name="HRV (ms)" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discipline Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Volume by Discipline</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No discipline data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-600">Week</th>
                    <th className="text-right py-2 font-medium text-gray-600">Volume</th>
                    <th className="text-right py-2 font-medium text-gray-600">Load</th>
                    <th className="text-right py-2 font-medium text-gray-600">Acts</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData?.map((week) => (
                    <tr key={week.week_start} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 text-gray-900">
                        {format(parseISO(week.week_start), 'MMM d')}
                      </td>
                      <td className="text-right py-2">{week.total_volume_hours?.toFixed(1)}h</td>
                      <td className="text-right py-2">{week.total_load?.toFixed(0)}</td>
                      <td className="text-right py-2">{week.activity_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Count Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="weekLabel" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
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
        </CardContent>
      </Card>
    </div>
  );
}
