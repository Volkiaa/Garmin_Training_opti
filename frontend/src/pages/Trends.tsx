import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';

interface WeeklyMetric {
  week_start: string;
  week_end: string;
  total_volume_hours: number;
  total_load: number;
  volume_by_discipline: Record<string, number>;
  avg_readiness: number;
  avg_hrv: number;
  avg_sleep_hours: number;
  activity_count: number;
}

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
        <Button variant="outline" size="sm" onClick={handleAggregate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="flex gap-2">
        {[4, 8, 12].map((w) => (
          <Button
            key={w}
            variant={weeks === w ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setWeeks(w)}
          >
            {w} Weeks
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold">
                  {weeklyData?.reduce((sum, w) => sum + (w.total_volume_hours || 0), 0).toFixed(1)}h
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-600">Total Load</p>
                <p className="text-2xl font-bold">
                  {weeklyData?.reduce((sum, w) => sum + (w.total_load || 0), 0).toFixed(0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-600">Avg Readiness</p>
                <p className="text-2xl font-bold">
                  {(weeklyData?.reduce((sum, w) => sum + (w.avg_readiness || 0), 0) / (weeklyData?.length || 1)).toFixed(0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-gray-600">Activities</p>
                <p className="text-2xl font-bold">
                  {weeklyData?.reduce((sum, w) => sum + (w.activity_count || 0), 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Week</th>
                      <th className="text-right py-2">Volume</th>
                      <th className="text-right py-2">Load</th>
                      <th className="text-right py-2">Activities</th>
                      <th className="text-right py-2">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData?.map((week) => (
                      <tr key={week.week_start} className="border-b border-gray-100">
                        <td className="py-2">
                          {new Date(week.week_start).toLocaleDateString('fr-FR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="text-right py-2">{week.total_volume_hours?.toFixed(1)}h</td>
                        <td className="text-right py-2">{week.total_load?.toFixed(0)}</td>
                        <td className="text-right py-2">{week.activity_count}</td>
                        <td className="text-right py-2">{week.avg_readiness?.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
