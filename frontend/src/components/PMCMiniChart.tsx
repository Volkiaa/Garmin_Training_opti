import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatLoad } from '../lib/utils';

interface PMCData {
  dates: string[];
  ctl: number[];
  atl: number[];
  tsb: number[];
  tss: number[];
}

interface PMCMiniChartProps {
  days?: number;
}

export function PMCMiniChart({ days = 30 }: PMCMiniChartProps) {
  const { data: pmcData, isLoading } = useQuery<PMCData>({
    queryKey: ['pmc', days],
    queryFn: async () => {
      const res = await fetch(`/api/v1/trends/pmc?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch PMC data');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
    );
  }

  if (!pmcData || pmcData.dates.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        No PMC data available
      </div>
    );
  }

  // Get latest values
  const latestIndex = pmcData.dates.length - 1;
  const currentCTL = pmcData.ctl[latestIndex];
  const currentATL = pmcData.atl[latestIndex];
  const currentTSB = pmcData.tsb[latestIndex];

  // Prepare chart data
  const chartData = pmcData.dates.map((date, index) => ({
    date,
    ctl: pmcData.ctl[index],
    atl: pmcData.atl[index],
    tsb: pmcData.tsb[index],
  }));

  // Determine TSB color
  const getTSBColor = (tsb: number) => {
    if (tsb >= 10) return 'text-emerald-400';
    if (tsb >= -10) return 'text-blue-400';
    if (tsb >= -20) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTSBLabel = (tsb: number) => {
    if (tsb >= 10) return 'Fresh';
    if (tsb >= -10) return 'Neutral';
    if (tsb >= -20) return 'Tired';
    return 'Overreaching';
  };

  return (
    <div className="space-y-3">
      {/* Sparkline Chart */}
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="ctl"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="atl"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className="text-lg font-bold text-blue-400">{formatLoad(currentCTL)}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fitness</p>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className="text-lg font-bold text-pink-400">{formatLoad(currentATL)}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fatigue</p>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className={`text-lg font-bold ${getTSBColor(currentTSB)}`}>
            {currentTSB > 0 ? '+' : ''}{formatLoad(currentTSB)}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            {getTSBLabel(currentTSB)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Fitness</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span>Fatigue</span>
        </div>
      </div>
    </div>
  );
}
