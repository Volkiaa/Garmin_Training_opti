import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MorphingCard } from './morphic/MorphingCard';
import { FluidButton } from './morphic/FluidButton';
import { formatLoad } from '../lib/utils';

interface PMCData {
  dates: string[];
  ctl: number[];
  atl: number[];
  tsb: number[];
  tss: number[];
}

export function PMCChart() {
  const [days, setDays] = useState(90);
  const [showTSB, setShowTSB] = useState(true);

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
      <MorphingCard>
        <div className="h-96 bg-white/5 rounded-xl animate-pulse" />
      </MorphingCard>
    );
  }

  if (!pmcData || pmcData.dates.length === 0) {
    return (
      <MorphingCard>
        <div className="text-center py-12 text-gray-400">
          No PMC data available
        </div>
      </MorphingCard>
    );
  }

  // Prepare chart data
  const chartData = pmcData.dates.map((date, index) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: date,
    ctl: pmcData.ctl[index],
    atl: pmcData.atl[index],
    tsb: pmcData.tsb[index],
    tss: pmcData.tss[index],
  }));

  // Get latest values
  const latestIndex = pmcData.dates.length - 1;
  const currentCTL = pmcData.ctl[latestIndex];
  const currentATL = pmcData.atl[latestIndex];
  const currentTSB = pmcData.tsb[latestIndex];

  // Determine form status
  const getFormStatus = (tsb: number) => {
    if (tsb >= 10) return { label: 'Fresh', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (tsb >= -10) return { label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-500' };
    if (tsb >= -20) return { label: 'Tired', color: 'text-amber-400', bg: 'bg-amber-500' };
    return { label: 'Overreaching', color: 'text-red-400', bg: 'bg-red-500' };
  };

  const formStatus = getFormStatus(currentTSB);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Performance Management Chart</h2>
          <span className={`px-2 py-1 text-xs rounded-full ${formStatus.bg}/20 ${formStatus.color} border border-${formStatus.bg}/30`}>
            {formStatus.label}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            {[30, 60, 90].map((d) => (
              <FluidButton
                key={d}
                variant={days === d ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}D
              </FluidButton>
            ))}
          </div>
          
          <FluidButton
            variant={showTSB ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowTSB(!showTSB)}
          >
            Show TSB
          </FluidButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Fitness (CTL)</p>
          <p className="text-2xl font-bold text-white">{formatLoad(currentCTL)}</p>
          <p className="text-xs text-gray-400">42-day average</p>
        </div>
        <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
          <p className="text-xs text-pink-400 uppercase tracking-wide mb-1">Fatigue (ATL)</p>
          <p className="text-2xl font-bold text-white">{formatLoad(currentATL)}</p>
          <p className="text-xs text-gray-400">7-day average</p>
        </div>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Form (TSB)</p>
          <p className="text-2xl font-bold text-white">
            {currentTSB > 0 ? '+' : ''}{formatLoad(currentTSB)}
          </p>
          <p className="text-xs text-gray-400">{formStatus.label}</p>
        </div>
      </div>

      {/* Chart */}
      <MorphingCard>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend 
                wrapperStyle={{ color: '#9ca3af' }}
              />
              
              {showTSB && (
                <>
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                  <ReferenceLine y={10} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={-10} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={-20} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
                </>
              )}
              
              <Line
                type="monotone"
                dataKey="ctl"
                name="Fitness (CTL)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="atl"
                name="Fatigue (ATL)"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#ec4899' }}
              />
              {showTSB && (
                <Line
                  type="monotone"
                  dataKey="tsb"
                  name="Form (TSB)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </MorphingCard>

      {/* Legend/Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
        <div className="p-3 bg-white/5 rounded-lg">
          <span className="text-blue-400 font-medium">CTL (Chronic Training Load)</span>
          <p>Your long-term fitness level. Built up over 42 days of consistent training.</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <span className="text-pink-400 font-medium">ATL (Acute Training Load)</span>
          <p>Your short-term fatigue level. Reflects the last 7 days of training stress.</p>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <span className="text-emerald-400 font-medium">TSB (Training Stress Balance)</span>
          <p>Your readiness to perform. Positive = fresh, negative = tired.</p>
        </div>
      </div>
    </div>
  );
}
