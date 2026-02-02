import { getDisciplineColor, getDisciplineLabel } from '../lib/utils';

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
        return (
          <button
            key={discipline}
            onClick={() => onToggleDiscipline(discipline)}
            className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
          >
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                isSelected
                  ? getDisciplineColor(discipline)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {getDisciplineLabel(discipline)}
              {isSelected && (
                <span className="ml-1 text-xs">×</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
