import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText, Dumbbell } from 'lucide-react';
import { MorphingCard, FluidButton } from './morphic';

interface WorkoutTemplate {
  id: number;
  name: string;
  discipline: string;
  duration_minutes: number;
  target_intensity: string;
}

interface PlannedWorkout {
  id?: number;
  workout_id: number | null;
  planned_date: string;
  planned_time: string;
  notes: string;
}

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  workoutTemplates: WorkoutTemplate[];
  existingPlan?: PlannedWorkout;
  onSave: (plan: PlannedWorkout) => void;
  onDelete?: (id: number) => void;
}

export function WorkoutPlanModal({
  isOpen,
  onClose,
  selectedDate,
  workoutTemplates,
  existingPlan,
  onSave,
  onDelete,
}: WorkoutPlanModalProps) {
  const [workoutId, setWorkoutId] = useState<string>(
    existingPlan?.workout_id?.toString() || ''
  );
  const [plannedTime, setPlannedTime] = useState(existingPlan?.planned_time || '09:00');
  const [notes, setNotes] = useState(existingPlan?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const plan: PlannedWorkout = {
      id: existingPlan?.id,
      workout_id: workoutId ? parseInt(workoutId) : null,
      planned_date: selectedDate,
      planned_time: plannedTime,
      notes: notes.trim(),
    };

    await onSave(plan);
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    if (existingPlan?.id && onDelete) {
      await onDelete(existingPlan.id);
      onClose();
    }
  };

  const selectedWorkout = workoutTemplates.find((w) => w.id.toString() === workoutId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
          >
            <MorphingCard className="w-full max-w-md pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {existingPlan ? 'Edit Planned Workout' : 'Plan Workout'}
                </h2>
                <FluidButton variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-5 h-5" />
                </FluidButton>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white font-medium">{selectedDate}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-purple-400" />
                    Workout Template
                  </label>
                  <select
                    value={workoutId}
                    onChange={(e) => setWorkoutId(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="bg-[#151520]">
                      Select a workout...
                    </option>
                    {workoutTemplates.map((workout) => (
                      <option
                        key={workout.id}
                        value={workout.id}
                        className="bg-[#151520]"
                      >
                        {workout.name} ({workout.duration_minutes}min,{' '}
                        {workout.target_intensity})
                      </option>
                    ))}
                  </select>
                  {selectedWorkout && (
                    <p className="text-xs text-gray-400">
                      {selectedWorkout.discipline} • {selectedWorkout.duration_minutes} minutes
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-yellow-400" />
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this workout..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <FluidButton
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={onClose}
                  >
                    Cancel
                  </FluidButton>
                  {existingPlan?.id && onDelete && (
                    <FluidButton
                      type="button"
                      variant="secondary"
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                      onClick={handleDelete}
                    >
                      Delete
                    </FluidButton>
                  )}
                  <FluidButton
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={isSubmitting || !workoutId}
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : existingPlan
                        ? 'Update'
                        : 'Plan Workout'}
                  </FluidButton>
                </div>
              </form>
            </MorphingCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
