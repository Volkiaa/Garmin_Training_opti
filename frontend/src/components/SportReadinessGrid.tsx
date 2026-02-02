import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface SportReadinessData {
  status: 'ready' | 'caution' | 'not_ready';
  blockers: string[];
}

interface SportReadinessGridProps {
  sportReadiness: Record<string, SportReadinessData>;
}

const SPORT_DISPLAY_NAMES: Record<string, string> = {
  easy_run: 'Easy Run',
  moderate_run: 'Moderate Run',
  hard_run: 'Hard Run',
  easy_bike: 'Easy Bike',
  moderate_bike: 'Moderate Bike',
  hyrox_intervals: 'Hyrox Intervals',
  strength_heavy: 'Heavy Strength',
  strength_light: 'Light Strength',
  swim: 'Swim',
};

export function SportReadinessGrid({ sportReadiness }: SportReadinessGridProps) {
  const categorized = {
    ready: [] as string[],
    caution: [] as string[],
    not_ready: [] as string[],
  };

  Object.entries(sportReadiness || {}).forEach(([sport, data]) => {
    if (data.status === 'ready') categorized.ready.push(sport);
    else if (data.status === 'caution') categorized.caution.push(sport);
    else categorized.not_ready.push(sport);
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'caution':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'not_ready':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50 border-green-200';
      case 'caution':
        return 'bg-yellow-50 border-yellow-200';
      case 'not_ready':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">What You Can Do Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categorized.ready.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Ready
              </h4>
              <div className="flex flex-wrap gap-2">
                {categorized.ready.map((sport) => (
                  <Badge
                    key={sport}
                    variant="default"
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                  >
                    {SPORT_DISPLAY_NAMES[sport] || sport}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {categorized.caution.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Possible
              </h4>
              <div className="flex flex-wrap gap-2">
                {categorized.caution.map((sport) => (
                  <Badge
                    key={sport}
                    variant="warning"
                    className="bg-yellow-50 text-yellow-800 border-yellow-300"
                  >
                    {SPORT_DISPLAY_NAMES[sport] || sport}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {categorized.not_ready.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Avoid
              </h4>
              <div className="space-y-2">
                {categorized.not_ready.map((sport) => (
                  <div
                    key={sport}
                    className={`p-2 rounded border ${getStatusColor('not_ready')}`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon('not_ready')}
                      <span className="font-medium text-sm">
                        {SPORT_DISPLAY_NAMES[sport] || sport}
                      </span>
                    </div>
                    {sportReadiness[sport]?.blockers && (
                      <ul className="mt-1 text-xs text-red-600 ml-6">
                        {sportReadiness[sport].blockers.map((blocker, idx) => (
                          <li key={idx}>{blocker}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!sportReadiness || Object.keys(sportReadiness).length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p>No sport readiness data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
