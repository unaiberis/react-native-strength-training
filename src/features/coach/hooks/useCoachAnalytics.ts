import { useQuery } from "@tanstack/react-query";
import {
  getVolumeHistory,
  getComplianceHistory,
  getPREvolution,
} from "@/lib/pocketbase/services/coach-analytics";
import type {
  VolumeDataPoint,
  ComplianceDataPoint,
  PREvolutionPoint,
} from "@/types/pocketbase";

const VOLUME_HISTORY_KEY = "coach-volume-history";
const COMPLIANCE_HISTORY_KEY = "coach-compliance-history";
const PR_EVOLUTION_KEY = "coach-pr-evolution";

/**
 * Hook for athlete volume-over-time chart data.
 */
export function useVolumeHistory(athleteId: string | undefined, weeks = 12) {
  return useQuery({
    queryKey: [VOLUME_HISTORY_KEY, athleteId, weeks],
    queryFn: () => getVolumeHistory(athleteId!, weeks),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 5,
    select: (data): VolumeDataPoint[] => data ?? [],
  });
}

/**
 * Hook for athlete weekly compliance chart data.
 */
export function useComplianceHistory(
  athleteId: string | undefined,
  weeks = 12,
) {
  return useQuery({
    queryKey: [COMPLIANCE_HISTORY_KEY, athleteId, weeks],
    queryFn: () => getComplianceHistory(athleteId!, weeks),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 5,
    select: (data): ComplianceDataPoint[] => data ?? [],
  });
}

/**
 * Hook for athlete PR evolution chart data.
 */
export function usePREvolution(athleteId: string | undefined, weeks = 24) {
  return useQuery({
    queryKey: [PR_EVOLUTION_KEY, athleteId, weeks],
    queryFn: () => getPREvolution(athleteId!, weeks),
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 5,
    select: (data): PREvolutionPoint[] => data ?? [],
  });
}

/**
 * Aggregated analytics hook — fetches volume, compliance, and PR data together.
 */
export function useCoachAnalytics(athleteId: string | undefined) {
  const volume = useVolumeHistory(athleteId);
  const compliance = useComplianceHistory(athleteId);
  const prEvolution = usePREvolution(athleteId);

  return {
    volumeData: volume.data ?? [],
    complianceData: compliance.data ?? [],
    prEvolutionData: prEvolution.data ?? [],
    isLoading: volume.isLoading || compliance.isLoading || prEvolution.isLoading,
    error: volume.error || compliance.error || prEvolution.error,
    refetch: () => {
      volume.refetch();
      compliance.refetch();
      prEvolution.refetch();
    },
  };
}
