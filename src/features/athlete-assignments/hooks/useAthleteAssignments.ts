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
import { listAssignmentsWithTemplateNames } from "../../../lib/pocketbase/services/program-assignments";
import type { ProgramAssignmentRow } from "../../../types/pocketbase";
import {
  computeProgramProgress,
  type ProgramPhaseSummary,
  type ProgramSummary,
} from "./program-types";

// ─── Selectors (pure, testable) ───────────────────────────────────────────

/**
 * Format a `Date` as a local-time `YYYY-MM-DD` string (no timezone shift).
 * Used to compare an assignment `started_at` against "today" (R5).
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

/** Options for the pure mapping function. */
export interface MapOptions {
  /** Override the derived program length in weeks (defaults to 8). */
  totalWeeks?: number;
  /** Reference "today" for status classification (defaults to `new Date()`). */
  today?: Date;
  /** Template name to use instead of placeholder. */
  templateName?: string | null;
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
 * Map a single `ProgramAssignmentRow` into the existing `ProgramSummary`
 * shape.
 *
 * Program assignments on PocketBase store text fields (not relations), so
 * template metadata is not expandable. Returns a placeholder name for the
 * program, empty description, and an empty `phases` array (R1 edge case:
 * orphaned assignment after template deletion).
 */
export function mapAssignmentToProgramSummary(
  row: ProgramAssignmentRow,
  opts: MapOptions = {},
): ProgramSummary {
  const totalWeeks = opts.totalWeeks ?? DEFAULT_PROGRAM_WEEKS;
  const today = opts.today ?? new Date();

  const startDate = row.started_at;
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

  const programName = opts.templateName ?? "Untitled Program";

  return {
    id: row.id,
    name: programName,
    description: "",
    startDate,
    endDate,
    totalWeeks,
    weeksCompleted,
    progressPercent,
    phases: [],
    status,
  };
}

/**
 * Derive the `currentProgram`, `upcomingPrograms`, and `pastPrograms` lists
 * from a set of assignment rows.
 *
 * Rules (D4 / D6):
 *  - skip `cancelled` rows for current/upcoming (but include in pastPrograms);
 *  - `currentProgram` = the `active` assignment with the latest `started_at`
 *    that is `<= today` (nearest started_at, not after today);
 *  - `upcomingPrograms` = assignments whose `started_at > today`
 *    (status-driven to "upcoming");
 *  - `pastPrograms` = completed or cancelled assignments with `started_at <= today`.
 */
export function deriveCurrentAndUpcoming(
  rows: (ProgramAssignmentRow & { templateName?: string | null })[],
  today: Date = new Date(),
): {
  currentProgram: ProgramSummary | null;
  upcomingPrograms: ProgramSummary[];
  pastPrograms: ProgramSummary[];
} {
  const visible = rows.filter((r) => r.status !== "cancelled");

  const currentRow = visible
    .filter(
      (r) =>
        r.status === "active" && new Date(r.started_at).getTime() <= today.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )[0];

  const upcomingRows = visible
    .filter((r) => new Date(r.started_at).getTime() > today.getTime())
    .sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    );

  // Past programs: completed or cancelled assignments with started_at <= today
  const pastRows = rows
    .filter(
      (r) =>
        (r.status === "completed" || r.status === "cancelled") &&
        new Date(r.started_at).getTime() <= today.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

  return {
    currentProgram: currentRow
      ? mapAssignmentToProgramSummary(currentRow, {
          today,
          templateName: (currentRow as any).templateName,
        })
      : null,
    upcomingPrograms: upcomingRows.map((r) =>
      mapAssignmentToProgramSummary(r, {
        today,
        templateName: (r as any).templateName,
      }),
    ),
    pastPrograms: pastRows.map((r) =>
      mapAssignmentToProgramSummary(r, {
        today,
        templateName: (r as any).templateName,
      }),
    ),
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated athlete's program assignments and derive the
 * `currentProgram`, `upcomingPrograms`, and `pastPrograms` lists.
 *
 * Uses `listAssignmentsWithTemplateNames` to resolve template names.
 */
export function useAthleteAssignments(): {
  currentProgram: ProgramSummary | null;
  upcomingPrograms: ProgramSummary[];
  pastPrograms: ProgramSummary[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: ["programs", userId],
    queryFn: () => listAssignmentsWithTemplateNames(userId as string),
    enabled: !!userId,
  });

  const rows = query.data ?? [];
  const { currentProgram, upcomingPrograms, pastPrograms } =
    deriveCurrentAndUpcoming(rows);

  return {
    currentProgram,
    upcomingPrograms,
    pastPrograms,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}
