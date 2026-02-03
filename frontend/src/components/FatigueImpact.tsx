// Fatigue impact visualization component

interface FatigueImpactProps {
  impact: {
    upper: number;
    lower: number;
    cardio: number;
    cns: number;
  };
}

const SYSTEMS = [
  { key: 'upper', label: 'Upper', color: 'text-blue-400', bgColor: 'bg-blue-400' },
  { key: 'lower', label: 'Lower', color: 'text-emerald-400', bgColor: 'bg-emerald-400' },
  { key: 'cardio', label: 'Cardio', color: 'text-orange-400', bgColor: 'bg-orange-400' },
  { key: 'cns', label: 'CNS', color: 'text-purple-400', bgColor: 'bg-purple-400' },
];

export function FatigueImpact({ impact }: FatigueImpactProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {SYSTEMS.map((system) => {
        const value = impact[system.key as keyof typeof impact] || 0;
        const percentage = value * 100;
        const intensity = Math.min(5, Math.ceil(Math.abs(percentage) / 20));
        
        return (
          <div key={system.key} className="text-center">
            <p className="text-sm text-gray-400 mb-2">{system.label}</p>
            <p className={`text-2xl font-bold ${system.color} mb-2`}>
              {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
            </p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div
                  key={dot}
                  className={`w-2 h-2 rounded-full ${
                    dot <= intensity ? system.bgColor : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
