import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, ChevronDown, ChevronUp, Zap, Heart, Mountain } from 'lucide-react';

interface Split {
  lap_number: number;
  distance_meters: number;
  duration_seconds: number;
  avg_pace_min_per_km: number;
  avg_hr: number;
  max_hr: number;
  avg_power: number;
  elevation_gain: number;
  elevation_loss: number;
}

interface SplitsResponse {
  splits: Split[];
}

interface SplitsTableProps {
  activityId: number;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPace(minutesPerKm: number): string {
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function SplitsTable({ activityId }: SplitsTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading } = useQuery<SplitsResponse>({
    queryKey: ['activity-splits', activityId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/activities/${activityId}/splits`);
      if (!res.ok) {
        throw new Error('Failed to fetch splits');
      }
      return res.json();
    },
  });

  const splits = data?.splits || [];

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Timer className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Laps & Splits</h3>
            <p className="text-xs text-gray-400">
              {isLoading ? 'Loading...' : `${splits.length} laps`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-white/5">
                    <tr>
                      <th className="px-4 py-3 font-medium">Lap</th>
                      <th className="px-4 py-3 font-medium">Dist (km)</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Pace (/km)</th>
                      <th className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> HR
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Pwr
                        </div>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1">
                          <Mountain className="w-3 h-3" /> Elev
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {splits.map((split) => (
                      <tr key={split.lap_number} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{split.lap_number}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {formatDistance(split.distance_meters)}
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono">
                          {formatDuration(split.duration_seconds)}
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono">
                          {formatPace(split.avg_pace_min_per_km)}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {split.avg_hr > 0 ? Math.round(split.avg_hr) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {split.avg_power > 0 ? Math.round(split.avg_power) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {split.elevation_gain > 0 ? `+${Math.round(split.elevation_gain)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
