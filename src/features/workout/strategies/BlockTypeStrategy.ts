import type { BlockType, PrescriptionConfig } from "../../../types/pocketbase";
import type { ExerciseInSession, LoggedSet } from "../../../stores/session-store";

// ─── Strategy Interface ──────────────────────────────────────────────────

export interface BlockTypeStrategy {
  /** The block type this strategy represents */
  readonly blockType: BlockType;

  /** Human-readable display name */
  readonly displayName: string;

  /** Short label for the timer (e.g. "AMRAP 8:00", "E2MOM") */
  readonly timerLabel: string | null;

  /** Whether this block type has a countdown/interval timer */
  readonly hasTimer: boolean;

  /** Timer duration in seconds (null = no timer) */
  readonly timerDurationSeconds: number | null;

  /** Whether the user can add extra sets beyond the target */
  readonly canAddExtraSets: boolean;

  /** Whether to show round counter during execution */
  readonly showRoundCounter: boolean;

  /** Whether to show timer_remaining field in the set log */
  readonly showTimerRemaining: boolean;

  /** Whether to show AMRAP result input (rounds + partial reps) */
  readonly showAmrapResult: boolean;

  /**
   * Get the maximum number of sets for this exercise.
   * Returns targetSets for straight sets, Infinity for AMRAP (time-based).
   */
  getMaxSets(exercise: ExerciseInSession): number;

  /**
   * Get additional input field names specific to this block type.
   * e.g. ["round"] for EMOM, ["timerRemaining"] for AMRAP.
   */
  getAdditionalFields(): string[];

  /**
   * Validate a set before logging.
   * Returns an error message string, or null if valid.
   */
  validateSet(set: Partial<LoggedSet>): string | null;

  /**
   * Get the next round number for an EMOM block.
   */
  getNextRound(exercise: ExerciseInSession): number;
}

// ─── Straight Set Strategy ───────────────────────────────────────────────

class StraightSetStrategyImpl implements BlockTypeStrategy {
  readonly blockType: BlockType = "straight_set";
  readonly displayName = "Straight Set";
  readonly timerLabel = null;
  readonly hasTimer = false;
  readonly timerDurationSeconds = null;
  readonly canAddExtraSets = false;
  readonly showRoundCounter = false;
  readonly showTimerRemaining = false;
  readonly showAmrapResult = false;

  getMaxSets(exercise: ExerciseInSession): number {
    return exercise.targetSets;
  }

  getAdditionalFields(): string[] {
    return [];
  }

  validateSet(_set: Partial<LoggedSet>): string | null {
    return null;
  }

  getNextRound(_exercise: ExerciseInSession): number {
    return 1;
  }
}

// ─── AMRAP Strategy ──────────────────────────────────────────────────────

class AMRAPStrategyImpl implements BlockTypeStrategy {
  readonly blockType: BlockType = "amrap";
  readonly displayName = "AMRAP";
  readonly hasTimer = true;
  readonly canAddExtraSets = true;
  readonly showRoundCounter = true;
  readonly showTimerRemaining = true;
  readonly showAmrapResult = true;

  get timerLabel(): string {
    return "";
  }

  get timerDurationSeconds(): number {
    return 0;
  }

  getMaxSets(_exercise: ExerciseInSession): number {
    return Infinity;
  }

  getAdditionalFields(): string[] {
    return ["timerRemaining"];
  }

  validateSet(_set: Partial<LoggedSet>): string | null {
    return null;
  }

  getNextRound(_exercise: ExerciseInSession): number {
    return 1;
  }
}

// ─── EMOM Strategy ───────────────────────────────────────────────────────

class EMOMStrategyImpl implements BlockTypeStrategy {
  readonly blockType: BlockType = "emom";
  readonly displayName = "EMOM";
  readonly hasTimer = true;
  readonly canAddExtraSets = true;
  readonly showRoundCounter = true;
  readonly showTimerRemaining = false;
  readonly showAmrapResult = false;

  get timerLabel(): string {
    return "";
  }

  get timerDurationSeconds(): number {
    return 0;
  }

  getMaxSets(_exercise: ExerciseInSession): number {
    return Infinity;
  }

  getAdditionalFields(): string[] {
    return ["round"];
  }

  validateSet(_set: Partial<LoggedSet>): string | null {
    return null;
  }

  getNextRound(exercise: ExerciseInSession): number {
    // Count logged sets for this exercise and add 1 (each set = 1 round in EMOM)
    const maxRound = exercise.loggedSets.reduce(
      (max, s) => Math.max(max, s.round ?? 0),
      0,
    );
    return maxRound + 1;
  }
}

// ─── Circuit Strategy ────────────────────────────────────────────────────

class CircuitStrategyImpl implements BlockTypeStrategy {
  readonly blockType: BlockType = "circuit";
  readonly displayName = "Circuit";
  readonly timerLabel = null;
  readonly hasTimer = false;
  readonly timerDurationSeconds = null;
  readonly canAddExtraSets = true;
  readonly showRoundCounter = true;
  readonly showTimerRemaining = false;
  readonly showAmrapResult = false;

  getMaxSets(_exercise: ExerciseInSession): number {
    return Infinity; // Circuits cycle through exercises; user advances manually
  }

  getAdditionalFields(): string[] {
    return ["round"];
  }

  validateSet(_set: Partial<LoggedSet>): string | null {
    return null;
  }

  getNextRound(exercise: ExerciseInSession): number {
    const maxRound = exercise.loggedSets.reduce(
      (max, s) => Math.max(max, s.round ?? 0),
      0,
    );
    return maxRound + 1;
  }
}

// ─── Strategy instances ──────────────────────────────────────────────────

const strategies: Record<BlockType, BlockTypeStrategy> = {
  straight_set: new StraightSetStrategyImpl(),
  amrap: new AMRAPStrategyImpl(),
  emom: new EMOMStrategyImpl(),
  circuit: new CircuitStrategyImpl(),
};

// ─── Factory ─────────────────────────────────────────────────────────────

export function getBlockTypeStrategy(blockType: BlockType): BlockTypeStrategy {
  return strategies[blockType] ?? strategies.straight_set;
}

/**
 * Get the strategy for an exercise in session.
 */
export function getStrategyForExercise(
  exercise: ExerciseInSession | null | undefined,
): BlockTypeStrategy {
  if (!exercise) return strategies.straight_set;
  return getBlockTypeStrategy(exercise.blockType);
}

/**
 * Configure a timer label from the strategy + exercise data.
 */
export function formatTimerLabel(
  strategy: BlockTypeStrategy,
  exercise: ExerciseInSession,
): string {
  switch (strategy.blockType) {
    case "amrap": {
      const minutes = exercise.timerMinutes ?? 8;
      return `AMRAP ${minutes}:00`;
    }
    case "emom": {
      const interval = exercise.timerMinutes ?? 2;
      return `E${interval}MOM`;
    }
    default:
      return "";
  }
}

/**
 * Get the timer duration in seconds for an exercise.
 */
export function getTimerDurationSeconds(exercise: ExerciseInSession): number | null {
  switch (exercise.blockType) {
    case "amrap":
    case "emom":
      return (exercise.timerMinutes ?? 8) * 60;
    default:
      return null;
  }
}
