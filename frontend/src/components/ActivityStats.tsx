import { Activity, Wind, TrendingUp, Mountain, Zap } from 'lucide-react';
import { MorphingCard } from './morphic';
import { getDisciplineGlowColor } from '../lib/morphic-utils';

// Extended interface to include new metric fields that are now returned by the API
// but might not be in the global Activity type definition yet.
interface ActivityWithStats {
  discipline: string;
  avg_hr: number | null;
  max_hr: number | null;
  avg_power?: number | null;
  normalized_power?: number | null;
  avg_speed?: number | null;
  avg_cadence?: number | null;
  elevation_gain?: number | null;
}

interface ActivityStatsProps {
  activity: ActivityWithStats;
}

function formatPace(speedMps: number | null | undefined): string {
  if (!speedMps || speedMps <= 0) return '-';
  const paceSeconds = 1000 / speedMps;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatSpeed(speedMps: number | null | undefined): string {
  if (!speedMps || speedMps <= 0) return '-';
  const kph = speedMps * 3.6;
  return `${kph.toFixed(1)} km/h`;
}

export function ActivityStats({ activity }: ActivityStatsProps) {
  const isRun = activity.discipline === 'run';
  const isBike = activity.discipline === 'bike' || activity.discipline === 'cycling';

  return (
    <MorphingCard glowColor={getDisciplineGlowColor(activity.discipline)}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Avg HR</p>
            <p className="text-sm font-medium text-white">
              {activity.avg_hr ? `${Math.round(activity.avg_hr)} bpm` : '-'}
            </p>
          </div>
        </div>

        {isBike ? (
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Avg Power</p>
              <p className="text-sm font-medium text-white">
                {activity.avg_power ? `${Math.round(activity.avg_power)} W` : '-'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">{isRun ? 'Pace' : 'Speed'}</p>
              <p className="text-sm font-medium text-white">
                {isRun ? formatPace(activity.avg_speed) : formatSpeed(activity.avg_speed)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Cadence</p>
            <p className="text-sm font-medium text-white">
              {activity.avg_cadence ? `${Math.round(activity.avg_cadence)} rpm` : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mountain className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Elevation</p>
            <p className="text-sm font-medium text-white">
              {activity.elevation_gain ? `${Math.round(activity.elevation_gain)} m` : '-'}
            </p>
          </div>
        </div>
      </div>
    </MorphingCard>
  );
}
