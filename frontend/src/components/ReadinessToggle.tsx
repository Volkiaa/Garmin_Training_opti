import { Button } from './ui/Button';

interface ReadinessToggleProps {
  version: 'v1' | 'v2';
  onChange: (version: 'v1' | 'v2') => void;
}

export function ReadinessToggle({ version, onChange }: ReadinessToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <Button
        variant={version === 'v1' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onChange('v1')}
        className="text-xs"
      >
        V1
      </Button>
      <Button
        variant={version === 'v2' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onChange('v2')}
        className="text-xs"
      >
        V2
      </Button>
    </div>
  );
}
