import { useQuery } from '@tanstack/react-query';

export interface PhaseData {
  phase: string;
  phase_name: string;
  weeks_out: number;
  event: {
    id: number;
    name: string;
    event_date: string;
    event_type: string;
    priority: string;
  };
}

export interface PhaseRecommendations {
  phase_type: string;
  volume_target_min: number;
  volume_target_max: number;
  intensity_easy_pct: number;
  intensity_hard_pct: number;
  focus: string;
  key_sessions: string[];
}

export interface CurrentPhaseResponse {
  phase: PhaseData | null;
  recommendations: PhaseRecommendations | null;
}

export function useCurrentPhaseWithRecommendations() {
  return useQuery<CurrentPhaseResponse>({
    queryKey: ['phase', 'current', 'recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/v1/phases/current/recommendations');
      if (!res.ok) throw new Error('Failed to fetch phase data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEventPhases(eventId: number) {
  return useQuery({
    queryKey: ['phases', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/phases`);
      if (!res.ok) throw new Error('Failed to fetch phases');
      return res.json();
    },
    enabled: !!eventId,
  });
}
