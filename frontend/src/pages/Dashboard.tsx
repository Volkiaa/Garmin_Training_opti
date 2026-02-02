import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useDashboard } from '../hooks/useDashboard';
import { useReadinessVersion } from '../hooks/useReadinessVersion';
import { useTriggerSync } from '../hooks/useSync';
import { getReadinessColor, formatDuration, formatDate, getDisciplineColor, getDisciplineLabel, getIntensityLabel } from '../lib/utils';
import { Activity, RefreshCw } from 'lucide-react';
import { ReadinessToggle } from '../components/ReadinessToggle';
import { SportReadinessGrid } from '../components/SportReadinessGrid';
import { PhaseIndicator } from '../components/PhaseIndicator';

export function Dashboard() {
  const { version, setReadinessVersion, isLoading: versionLoading } = useReadinessVersion();
  const { data: dashboard, isLoading, error } = useDashboard(version);
  const triggerSync = useTriggerSync();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const { readiness, training_load, fatigue, recent_activities, week_summary } = dashboard;

  return (
    <div className="space-y-6">
      <PhaseIndicator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {!versionLoading && (
            <ReadinessToggle version={version} onChange={setReadinessVersion} />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerSync.mutate({ days: 28 })}
          disabled={triggerSync.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
          Sync (28d)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="text-center">
            <h2 className="text-sm font-medium text-gray-600 mb-4">Readiness Score</h2>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(readiness.score / 100) * 351.86} 351.86`}
                  className={getReadinessColor(readiness.score)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getReadinessColor(readiness.score)}`}>
                  {readiness.score}
                </span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <p className={`mt-4 text-sm font-medium ${getReadinessColor(readiness.score)}`}>
              {readiness.category.charAt(0).toUpperCase() + readiness.category.slice(1)}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardContent>
            <h2 className="text-sm font-medium text-gray-600 mb-4">Training Load</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Acute (7d)</span>
                <span className="font-medium">{training_load.acute.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chronic (28d)</span>
                <span className="font-medium">{training_load.chronic.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">ACWR</span>
                <Badge variant={training_load.acwr_status === 'optimal' ? 'success' : training_load.acwr_status === 'danger' ? 'danger' : 'warning'}>
                  {training_load.acwr.toFixed(2)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardContent>
            <h2 className="text-sm font-medium text-gray-600 mb-4">Fatigue</h2>
            <div className="space-y-3">
              {Object.entries(fatigue).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-600">{key}</span>
                    <span className="font-medium">{(value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value > 0.7 ? 'bg-red-500' : value > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h2 className="text-sm font-medium text-gray-600 mb-3">Today&apos;s Guidance</h2>
            <p className="text-lg font-medium text-gray-900 mb-3">{readiness.guidance.recommendation}</p>
            
            {readiness.guidance.avoid.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-red-600 font-medium">Avoid:</span>
                <p className="text-sm text-gray-700">{readiness.guidance.avoid.join(', ')}</p>
              </div>
            )}
            
            {readiness.guidance.suggested.length > 0 && (
              <div>
                <span className="text-sm text-green-600 font-medium">Suggested:</span>
                <p className="text-sm text-gray-700">{readiness.guidance.suggested.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <SportReadinessGrid sportReadiness={readiness.sport_specific || {}} />
      </div>

      <Card>
        <CardContent>
          <h2 className="text-sm font-medium text-gray-600 mb-3">Why This Score</h2>
          <div className="space-y-2">
            {readiness.factors.map((factor) => (
              <div key={factor.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={factor.status === 'positive' ? 'text-green-600' : factor.status === 'negative' ? 'text-red-600' : 'text-gray-600'}>
                    {factor.status === 'positive' ? '✓' : factor.status === 'negative' ? '✗' : '•'}
                  </span>
                  <span className="text-sm text-gray-700">{factor.name}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${factor.status === 'positive' ? 'text-green-600' : factor.status === 'negative' ? 'text-red-600' : 'text-gray-600'}`}>
                    {factor.value}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{factor.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-medium text-gray-600 mb-3">Recent Activities</h2>
          <div className="space-y-2">
            {recent_activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.activity_name || getDisciplineLabel(activity.discipline)}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(activity.started_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="default" className={getDisciplineColor(activity.discipline)}>
                    {getDisciplineLabel(activity.discipline)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDuration(activity.duration_minutes)} • {getIntensityLabel(activity.intensity_zone)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-medium text-gray-600 mb-3">This Week</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{week_summary.total_hours.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Total Volume</p>
            </div>
            {Object.entries(week_summary.by_discipline)
              .filter(([_, hours]) => hours > 0)
              .map(([discipline, hours]) => (
                <div key={discipline}>
                  <p className={`text-2xl font-bold ${getDisciplineColor(discipline).split(' ')[0]}`}>
                    {hours.toFixed(1)}h
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{discipline}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
