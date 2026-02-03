interface HRZoneChartProps {
  zones: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  totalMinutes: number;
}

const ZONE_CONFIG = [
  { key: 'zone1', label: 'Z1 Recovery', color: '#6b7280' },   // gray
  { key: 'zone2', label: 'Z2 Endurance', color: '#3b82f6' },  // blue
  { key: 'zone3', label: 'Z3 Tempo', color: '#10b981' },      // green
  { key: 'zone4', label: 'Z4 Threshold', color: '#f59e0b' },  // orange
  { key: 'zone5', label: 'Z5 VO2max', color: '#ef4444' },     // red
];

function formatTime(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HRZoneChart({ zones, totalMinutes }: HRZoneChartProps) {
  const data = ZONE_CONFIG.map((config) => {
    const minutes = zones[config.key as keyof typeof zones] || 0;
    const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
    return {
      name: config.label,
      minutes,
      percentage,
      color: config.color,
    };
  });

  return (
    <div className="space-y-3">
      {data.map((zone) => (
        <div key={zone.name} className="flex items-center gap-3">
          <span className="text-sm text-gray-400 w-28">{zone.name}</span>
          <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${zone.percentage}%`,
                backgroundColor: zone.color,
              }}
            />
          </div>
          <span className="text-sm text-white w-24 text-right">
            {formatTime(zone.minutes)} ({zone.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}
