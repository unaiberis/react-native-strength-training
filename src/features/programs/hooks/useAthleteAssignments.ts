/**
 * Athlete assignment consumption hook.
 *
 * Reads the coach-created `program_assignments` rows for the authenticated
 * athlete (via `listAssignments`) and maps each row into the existing
 * `ProgramSummary` shape used by the Programs tab / detail screens.
 *
 * Pure mapping helpers (`mapAssignmentToProgramSummary`,
 * `deriveCurrentAndUpcoming`) are exported so they can be unit-tested without
 * React or network access (R7).
 */

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/auth-store";
import { listAssignments } from "../../../lib/pocketbase/services/program-assignments";
import type { ProgramAssignmentRow, TemplateRow } from "../../../types/pocketbase";
import {
  computeProgramProgress,
  type ProgramPhaseSummary,
  type ProgramSummary,
} from "./usePrograms";

// ─── Selectors (pure, testable) ───────────────────────────────────────────

/**
 * Format a `Date` as a local-time `YYYY-MM-DD` string (no timezone shift).
 * Used to compare an assignment `start_date` against "today" (R5).
 */
export function todayStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Return the first program whose `startDate` equals `dateStr`, or `null`.
 * Operates on the derived `ProgramSummary[]` (which carries the assignment
 * id as `id` and the `start_date` as `startDate`) so callers can deep-link
 * straight to `program-detail/{id}` (R5). Null entries are skipped.
 */
export function findAssignedOnDate(
  programs: (ProgramSummary | null)[],
  dateStr: string,
): ProgramSummary | null {
  for (const p of programs) {
    if (p && p.startDate === dateStr) return p;
  }
  return null;
}

/**
 * Convenience wrapper over `findAssignedOnDate` using the local "today".
 */
export function findAssignedToday(
  programs: (ProgramSummary | null)[],
  today: Date = new Date(),
): ProgramSummary | null {
  return findAssignedOnDate(programs, todayStr(today));
}

// ─── Types ─────────────────────────────────────────────────────────────────

/** Assignment row enriched with the expanded `template` relation. */
export type AssignmentWithTemplate = ProgramAssignmentRow & {
  expand?: { template?: TemplateRow | null };
};

/** Options for the pure mapping function. */
export interface MapOptions {
  /** Override the derived program length in weeks (defaults to 8). */
  totalWeeks?: number;
  /** Reference "today" for status classification (defaults to `new Date()`). */
  today?: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Default program length in weeks. The `program_assignments` row carries no
 * explicit length, so we derive a fixed window. Documented assumption (design
 * Open Question) — a coach-assigned length would override this later (SPEC-0x).
 */
export const DEFAULT_PROGRAM_WEEKS = 8;

/** Workouts per derived phase. A template maps to a single training day. */
export const DEFAULT_WORKOUT_COUNT = 1;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Add `weeks` to a `YYYY-MM-DD` start date and return the resulting date-only
 * string (local-time, timezone-safe). Pure — no external date library.
 */
function addWeeks(startDate: string, weeks: number): string {
  const d = new Date(`${startDate}T00:00:00`);
  d.setDate(d.getDate() + 7 * weeks);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Map a single `ProgramAssignmentRow` (with expanded `template`) into the
 * existing `ProgramSummary` shape.
 *
 * Null-guards a missing / absent `expand.template` (orphaned assignment after
 * template deletion) — returns a placeholder name, empty description, and an
 * empty `phases` array without dereferencing the template (R1 edge case).
 */
export function mapAssignmentToProgramSummary(
  row: AssignmentWithTemplate,
  opts: MapOptions = {},
): ProgramSummary {
  const totalWeeks = opts.totalWeeks ?? DEFAULT_PROGRAM_WEEKS;
  const today = opts.today ?? new Date();
  const tpl = row.expand?.template ?? null;

  const startDate = row.start_date;
  const endDate = addWeeks(startDate, totalWeeks);
  const isUpcoming = new Date(startDate).getTime() > today.getTime();

  const status: ProgramSummary["status"] = isUpcoming
    ? "upcoming"
    : row.status === "completed"
      ? "completed"
      : "active";

  const { weeksCompleted, progressPercent } = computeProgramProgress(
    startDate,
    endDate,
    totalWeeks,
  );

  // Single-phase fallback (D2): one phase built from the whole template.
  const phases: ProgramPhaseSummary[] = tpl
    ? [
        {
          id: `phase-${tpl.id}`,
          name: tpl.name,
          weekStart: 1,
          weekEnd: totalWeeks,
          workoutCount: DEFAULT_WORKOUT_COUNT,
        },
      ]
    : [];

  return {
    id: row.id,
    name: tpl?.name ?? "Untitled Program",
    description: tpl?.description ?? "",
    startDate,
    endDate,
    totalWeeks,
    weeksCompleted,
    progressPercent,
    phases,
    status,
  };
}

/**
 * Derive the `currentProgram` and `upcomingPrograms` lists from a set of
 * assignment rows.
 *
 * Rules (D4 / D6):
 *  - skip `cancelled` rows;
 *  - `currentProgram` = the `active` assignment with the latest `start_date`
 *    that is `<= today` (nearest start_date, not after today);
 *  - `upcomingPrograms` = assignments whose `start_date > today`
 *    (status-driven to "upcoming");
 *  - `completed` rows with `start_date <= today` are NOT surfaced (history is
 *    out of scope).
 */
export function deriveCurrentAndUpcoming(
  rows: AssignmentWithTemplate[],
  today: Date = new Date(),
): { currentProgram: ProgramSummary | null; upcomingPrograms: ProgramSummary[] } {
  const visible = rows.filter((r) => r.status !== "cancelled");

  const currentRow = visible
    .filter(
      (r) =>
        r.status === "active" && new Date(r.start_date).getTime() <= today.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    )[0];

  const upcomingRows = visible
    .filter((r) => new Date(r.start_date).getTime() > today.getTime())
    .sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );

  return {
    currentProgram: currentRow
      ? mapAssignmentToProgramSummary(currentRow, { today })
      : null,
    upcomingPrograms: upcomingRows.map((r) =>
      mapAssignmentToProgramSummary(r, { today }),
    ),
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated athlete's program assignments and derive the
 * `currentProgram` + `upcomingPrograms` lists.
 *
 * Online-only (R1): calls `listAssignments(user.id)`; surfaces loading/error
 * via the query lifecycle.
 */
export function useAthleteAssignments(): {
  currentProgram: ProgramSummary | null;
  upcomingPrograms: ProgramSummary[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: ["programs", userId],
    queryFn: () => listAssignments(userId as string),
    enabled: !!userId,
  });

  const rows = (query.data ?? []) as AssignmentWithTemplate[];
  const { currentProgram, upcomingPrograms } = deriveCurrentAndUpcoming(rows);

  return {
    currentProgram,
    upcomingPrograms,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
