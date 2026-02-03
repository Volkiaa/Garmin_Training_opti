import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { MorphingCard, FluidButton } from '../components/morphic';
import { WorkoutPlanModal } from '../components/WorkoutPlanModal';
import { staggerContainer, staggerItem } from '../lib/animations';
import { getDisciplineLabel } from '../lib/utils';
import { getDisciplineGlowColor } from '../lib/morphic-utils';

interface Activity {
  id: string;
  activity_name: string | null;
  discipline: string;
  started_at: string;
  duration_minutes: number;
  training_load: number | null;
}

interface WorkoutTemplate {
  id: number;
  name: string;
  discipline: string;
  duration_minutes: number;
  target_intensity: string;
}

interface PlannedWorkout {
  id: number;
  workout_id: number;
  planned_date: string;
  planned_time: string;
  status: 'planned' | 'completed' | 'skipped';
  notes: string;
  workout?: WorkoutTemplate;
}

export function Calendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingPlan, setEditingPlan] = useState<PlannedWorkout | undefined>();

  // Mock workout templates (until backend API is ready)
  const workoutTemplates: WorkoutTemplate[] = [
    { id: 1, name: 'Hyrox Class', discipline: 'hyrox', duration_minutes: 60, target_intensity: 'high' },
    { id: 2, name: 'Strength Training', discipline: 'strength', duration_minutes: 45, target_intensity: 'medium' },
    { id: 3, name: 'Easy Run', discipline: 'run', duration_minutes: 30, target_intensity: 'low' },
    { id: 4, name: 'Long Run', discipline: 'run', duration_minutes: 90, target_intensity: 'medium' },
    { id: 5, name: 'Recovery Bike', discipline: 'bike', duration_minutes: 45, target_intensity: 'low' },
    { id: 6, name: 'Pool Swim', discipline: 'swim', duration_minutes: 45, target_intensity: 'medium' },
  ];

  // Get start and end of month for API query
  const { startDate, endDate, year, month } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      year,
      month,
    };
  }, [currentDate]);

  // Fetch activities for the month
  const { data: activitiesData, isLoading } = useQuery<{activities: Activity[]}>({
    queryKey: ['activities', 'calendar', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/activities?start_date=${startDate}&end_date=${endDate}&limit=100`
      );
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      return data;
    },
  });

  const activities = activitiesData?.activities || [];

  // Fetch planned workouts for the month (mock until backend API is ready)
  const { data: _plannedWorkouts = [] } = useQuery({
    queryKey: ['planned-workouts', startDate, endDate],
    queryFn: async () => {
      // TODO: Replace with actual API call when backend is ready
      // const res = await fetch(`/api/v1/planned-workouts?start_date=${startDate}&end_date=${endDate}`);
      // return res.json() as PlannedWorkout[];
      return [] as PlannedWorkout[];
    },
  });

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, Activity[]> = {};
    activities.forEach((activity) => {
      const date = activity.started_at.split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });
    return grouped;
  }, [activities]);

  // Group planned workouts by date - currently unused but available for future calendar features
  // const plannedWorkoutsByDate = useMemo(() => {
  //   const grouped: Record<string, PlannedWorkout[]> = {};
  //   plannedWorkouts.forEach((workout) => {
  //     if (!grouped[workout.planned_date]) grouped[workout.planned_date] = [];
  //     grouped[workout.planned_date].push(workout);
  //   });
  //   return grouped;
  // }, [plannedWorkouts]);

  // Mutations for planned workouts
  const savePlannedWorkout = useMutation({
    mutationFn: async (plan: { id?: number; workout_id: number | null; planned_date: string; planned_time: string; notes: string }) => {
      // TODO: Replace with actual API call when backend is ready
      console.log('Saving planned workout:', plan);
      return { id: plan.id || Date.now(), ...plan };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-workouts'] });
    },
  });

  const deletePlannedWorkout = useMutation({
    mutationFn: async (id: number) => {
      // TODO: Replace with actual API call when backend is ready
      console.log('Deleting planned workout:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-workouts'] });
    },
  });

  const handleOpenModal = (date: string, plan?: PlannedWorkout) => {
    setSelectedDate(date);
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (plan: { id?: number; workout_id: number | null; planned_date: string; planned_time: string; notes: string }) => {
    await savePlannedWorkout.mutateAsync(plan);
  };

  const handleDeletePlan = async (id: number) => {
    await deletePlannedWorkout.mutateAsync(id);
  };

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    const days: Array<{ date: number; dateString: string; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        date: prevDate,
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDate).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 6 rows (42 cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        date: i,
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Calendar
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <FluidButton
            variant="primary"
            size="sm"
            onClick={() => handleOpenModal(today)}
            className="hidden sm:flex"
          >
            <Plus className="w-4 h-4 mr-2" />
            Plan Workout
          </FluidButton>
          <FluidButton variant="secondary" size="sm" onClick={goToToday}>
            Today
          </FluidButton>
          <div className="flex items-center gap-2">
            <FluidButton variant="ghost" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-5 h-5" />
            </FluidButton>
            <span className="text-lg font-semibold text-white min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <FluidButton variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </FluidButton>
          </div>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(59, 130, 246, 0.2)">
          <div className="space-y-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayActivities = activitiesByDate[day.dateString] || [];
                const isToday = day.dateString === today;

                return (
                  <motion.div
                    key={`${day.dateString}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className={`
                      min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer
                      ${day.isCurrentMonth
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-white/[0.02] border-white/5 opacity-50'
                      }
                      ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0a0a0f]' : ''}
                    `}
                    onClick={() => {
                      if (dayActivities.length > 0) {
                        navigate(`/activities/${dayActivities[0].id}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`
                          text-sm font-medium
                          ${isToday ? 'text-blue-400' : 'text-gray-300'}
                          ${!day.isCurrentMonth ? 'text-gray-600' : ''}
                        `}
                      >
                        {day.date}
                      </span>
                      {dayActivities.length > 1 && (
                        <span className="text-xs text-gray-500">
                          {dayActivities.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayActivities.slice(0, 3).map((activity) => (
                        <div
                          key={activity.id}
                          className="text-xs truncate px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${getDisciplineGlowColor(activity.discipline)}20`,
                            color: getDisciplineGlowColor(activity.discipline),
                          }}
                        >
                          {activity.activity_name || getDisciplineLabel(activity.discipline)}
                        </div>
                      ))}
                      {dayActivities.length > 3 && (
                        <div className="text-xs text-gray-500 px-1.5">
                          +{dayActivities.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </MorphingCard>
      </motion.div>

      {/* Legend */}
      <motion.div variants={staggerItem}>
        <MorphingCard>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Activity Types</h3>
          <div className="flex flex-wrap gap-3">
            {['hyrox', 'strength', 'run', 'bike', 'swim', 'other'].map((discipline) => (
              <div key={discipline} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getDisciplineGlowColor(discipline) }}
                />
                <span className="text-xs text-gray-400 capitalize">{discipline}</span>
              </div>
            ))}
          </div>
        </MorphingCard>
      </motion.div>

      {/* Workout Plan Modal */}
      <WorkoutPlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlan(undefined);
        }}
        selectedDate={selectedDate}
        workoutTemplates={workoutTemplates}
        existingPlan={editingPlan}
        onSave={handleSavePlan}
        onDelete={handleDeletePlan}
      />
    </motion.div>
  );
}
