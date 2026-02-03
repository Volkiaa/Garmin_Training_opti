import { useQuery } from '@tanstack/react-query';

export interface PMCData {
  dates: string[];
  ctl: number[];
  atl: number[];
  tsb: number[];
  tss: number[];
}

export function usePMC(days: number = 90) {
  return useQuery<PMCData>({
    queryKey: ['pmc', days],
    queryFn: async () => {
      const res = await fetch(`/api/v1/trends/pmc?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch PMC data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getFormStatus(tsb: number): { label: string; color: string } {
  if (tsb > 15) return { label: 'Very Fresh', color: 'text-emerald-400' };
  if (tsb > 5) return { label: 'Fresh', color: 'text-green-400' };
  if (tsb > -5) return { label: 'Neutral', color: 'text-gray-400' };
  if (tsb > -15) return { label: 'Fatigued', color: 'text-orange-400' };
  return { label: 'Very Fatigued', color: 'text-red-400' };
}
