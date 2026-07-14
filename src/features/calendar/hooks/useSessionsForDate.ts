/**
 * Hook to fetch workout sessions for a specific date.
 *
 * On native: queries local SQLite `workout_sessions` table.
 * On web: queries PocketBase `workout_sessions` collection.
 * Merges assigned (not started) workouts from the athlete's
 * program assignments via `useAthleteAssignments`.
 */

import { Platform } from "react-native";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase/client";
import { fetchTemplateNames } from "@/lib/pocketbase/services/fetch-template-names";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAthleteAssignments,
  findAssignedOnDate,
} from "@/features/athlete-assignments/hooks/useAthleteAssignments";
import type { ProgramSummary } from "@/features/athlete-assignments/hooks/program-types";

// ─── Constants ──────────────────────────────────────────────────────────

const SESSIONS_FOR_DATE_QUERY_KEY = "sessions-for-date";

// ─── Types ──────────────────────────────────────────────────────────────

export interface WorkoutSummary {
  id: string;
  templateName: string | null;
  status: "assigned" | "active" | "completed";
  startedAt: string | null;
  durationMinutes: number | null;
  exerciseCount: number;
}

// ─── SQLite Row Types ──────────────────────────────────────────────────

interface SessionRow {
  id: string;
  template_id: string | null;
  template_name: string | null;
  status: string;
  started_at: string;
  duration_seconds: number | null;
  exercise_count: number;
}

interface PBSessionRecord {
  id: string;
  started_at: string;
  status: string;
  workout_template_id: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function mapRowToSummary(row: SessionRow): WorkoutSummary {
  return {
    id: row.id,
    templateName: row.template_name ?? null,
    status: row.status === "active" ? "active" : "completed",
    startedAt: row.started_at,
    durationMinutes:
      row.duration_seconds != null
        ? Math.round(row.duration_seconds / 60)
        : null,
    exerciseCount: row.exercise_count,
  };
}

// ─── Data Fetching ──────────────────────────────────────────────────────

/**
 * Fetch sessions from local SQLite for a given date.
 */
async function fetchSessionsFromLocal(date: string): Promise<WorkoutSummary[]> {
  const { getDb } = await import("@/lib/db/database");
  const db = await getDb();

  const rows = await db.getAllAsync<SessionRow>(
    `SELECT
       ws.id,
       ws.template_id,
       wt.name AS template_name,
       ws.status,
       ws.started_at,
       ws.duration_seconds,
       (SELECT COUNT(DISTINCT es.exercise_id)
        FROM exercise_sets es
        WHERE es.session_id = ws.id) AS exercise_count
     FROM workout_sessions ws
     LEFT JOIN workout_templates wt ON ws.template_id = wt.id
     WHERE DATE(ws.started_at) = ?
     ORDER BY ws.started_at`,
    [date],
  );

  return rows.map(mapRowToSummary);
}

/**
 * Fetch sessions from PocketBase for a given date (web).
 *
 * Returns all sessions (completed and active) for the date,
 * with template name and exercise count resolved.
 */
async function fetchSessionsFromPB(
  userId: string,
  date: string,
): Promise<WorkoutSummary[]> {
  const nextDayNum = Number(date.slice(8)) + 1;
  const endDate = date.slice(0, 8) + String(nextDayNum).padStart(2, "0");

  const sessions = await pb.collection("workout_sessions").getFullList({
    filter: `user_id = '${userId}' && status != 'cancelled' && started_at >= '${date}' && started_at < '${endDate}'`,
    sort: "started_at",
    fields: "id,started_at,status,workout_template_id",
    requestKey: null,
  });

  const rows = (sessions ?? []) as unknown as PBSessionRecord[];

  // Batch-fetch template names for all sessions in one call
  const templateIds = [...new Set(rows.map((r) => r.workout_template_id).filter((id): id is string => id != null))];
  const nameMap = await fetchTemplateNames(templateIds);

  const results: WorkoutSummary[] = await Promise.all(
    rows.map(async (s) => {
      const templateName = nameMap.get(s.workout_template_id ?? "") ?? null;

      const sets = await pb.collection("exercise_sets").getFullList({
        filter: `workout_session_id = '${s.id}'`,
        fields: "id,exercise_id",
        requestKey: null,
      });

      const setList = (sets ?? []) as unknown as Array<{
        id: string;
        exercise_id: string;
      }>;
      const uniqueExercises = new Set(setList.map((set) => set.exercise_id));

      return {
        id: s.id,
        templateName,
        status: s.status === "completed" ? "completed" : "active",
        startedAt: s.started_at,
        durationMinutes: null,
        exerciseCount: uniqueExercises.size,
      } satisfies WorkoutSummary;
    }),
  );

  return results;
}

/**
 * Fetch sessions from the appropriate data source based on platform.
 */
async function fetchSessions(
  date: string,
  userId: string | undefined,
): Promise<WorkoutSummary[]> {
  if (Platform.OS === "web") {
    if (!userId) return [];
    return fetchSessionsFromPB(userId, date);
  }
  return fetchSessionsFromLocal(date);
}

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Returns workout sessions for a given date, including assigned
 * (not started) workouts from the athlete's program assignments.
 *
 * @param date — YYYY-MM-DD string, or null (returns empty array)
 */
export function useSessionsForDate(date: string | null) {
  const userId = useAuthStore((s) => s.user?.id);
  const { currentProgram, upcomingPrograms } = useAthleteAssignments();

  const query = useQuery({
    queryKey: [SESSIONS_FOR_DATE_QUERY_KEY, date, userId],
    queryFn: () => fetchSessions(date!, userId!),
    enabled:
      date != null && (Platform.OS !== "web" || userId != null),
    staleTime: 60_000,
  });

  // Merge assigned workouts from athlete assignments
  const programs = [currentProgram, ...upcomingPrograms].filter(
    Boolean,
  ) as ProgramSummary[];
  const assignedProgram = date ? findAssignedOnDate(programs, date) : null;

  const sessions = useMemo(() => {
    const dbSessions = query.data ?? [];
    if (!assignedProgram) return dbSessions;

    // Only add if not already present from DB
    const exists = dbSessions.some((s) => s.id === assignedProgram.id);
    if (exists) return dbSessions;

    return [
      ...dbSessions,
      {
        id: assignedProgram.id,
        templateName: assignedProgram.name,
        status: "assigned" as const,
        startedAt: null,
        durationMinutes: null,
        exerciseCount: 0,
      },
    ];
  }, [query.data, assignedProgram]);

  return {
    sessions,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
