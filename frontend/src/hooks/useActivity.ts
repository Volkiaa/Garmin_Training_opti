import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Activity {
  id: number;
  activity_name: string;
  discipline: string;
  started_at: string;
  duration_minutes: number;
  distance_meters: number | null;
  training_load: number;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  avg_power: number | null;
  max_power: number | null;
  normalized_power: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  avg_cadence: number | null;
  max_cadence: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
  aerobic_te: number | null;
  anaerobic_te: number | null;
  hr_zones: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
  fatigue_impact: {
    upper: number;
    lower: number;
    cardio: number;
    cns: number;
  };
  notes: string | null;
}

export function useActivity(id: string | undefined) {
  return useQuery<Activity>({
    queryKey: ['activity', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/activities/${id}`);
      if (!res.ok) throw new Error('Activity not found');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`/api/v1/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to update activity');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['activity', id] });
    },
  });
}
