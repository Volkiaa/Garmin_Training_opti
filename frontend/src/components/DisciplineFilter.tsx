import { getDisciplineLabel } from '../lib/utils';
import { getDisciplineGlowColor } from '../lib/morphic-utils';

const AVAILABLE_DISCIPLINES = ['run', 'bike', 'swim', 'strength', 'hyrox', 'other'] as const;

interface DisciplineFilterProps {
  selectedDisciplines: string[];
  onToggleDiscipline: (discipline: string) => void;
}

export function DisciplineFilter({
  selectedDisciplines,
  onToggleDiscipline,
}: DisciplineFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_DISCIPLINES.map((discipline) => {
        const isSelected = selectedDisciplines.includes(discipline);
        const glowColor = getDisciplineGlowColor(discipline);

        return (
          <button
            key={discipline}
            onClick={() => onToggleDiscipline(discipline)}
            className={`relative inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-300'
            }`}
            style={{
              boxShadow: isSelected ? `0 0 12px ${glowColor}40, inset 0 0 8px ${glowColor}20` : 'none',
            }}
          >
            <span
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: glowColor }}
            />
            {getDisciplineLabel(discipline)}
            {isSelected && (
              <span className="ml-1.5 text-xs opacity-80">×</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
