import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Calendar, Target } from 'lucide-react';

interface PhaseData {
  phase: string;
  phase_name: string;
  weeks_out: number | null;
  event?: {
    id: number;
    name: string;
    event_date: string;
    priority: string;
  } | null;
}

export function PhaseIndicator() {
  const { data: phaseData, isLoading } = useQuery<PhaseData>({
    queryKey: ['current-phase'],
    queryFn: async () => {
      const res = await fetch('/api/v1/phases/current');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse flex gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!phaseData) return null;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'taper':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'peak':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'build':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'base':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className={getPhaseColor(phaseData.phase)}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-white/50 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{phaseData.phase_name}</h3>
              {phaseData.weeks_out !== null && (
                <Badge variant="default" className="bg-white/50">
                  {phaseData.weeks_out.toFixed(1)} weeks out
                </Badge>
              )}
            </div>
            {phaseData.event && (
              <div className="flex items-center gap-2 mt-1 text-sm opacity-80">
                <Calendar className="w-3 h-3" />
                <span>{phaseData.event.name}</span>
                <span>•</span>
                <Badge variant="default" className="text-xs bg-white/50">
                  {phaseData.event.priority}-Race
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
