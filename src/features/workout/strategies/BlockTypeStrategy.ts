/**
 * Block Type Strategy Pattern
 *
 * Each block type (straight_set, amrap, emom, circuit) defines its own
 * behavior for set limits, field requirements, validation, round tracking,
 * and auto-stop logic.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export type BlockType = "straight_set" | "amrap" | "emom" | "circuit";

export interface BlockConfig {
  blockType: BlockType;
  timerMinutes?: number;
  restSeconds?: number;
  rounds?: number;
  exercises?: string[];
}

export interface BlockTypeStrategy {
  /** Maximum number of sets for this block. Infinity for time/round-based types. */
  getMaxSets(blockConfig: BlockConfig): number;

  /** Additional input fields specific to this block type (e.g. round, timerRemaining). */
  getAdditionalFields(): string[];

  /** Validate a set before logging. Returns error message or null if valid. */
  validateSet(set: { reps?: number; weight?: number; round?: number }): string | null;

  /** Determine the next round number given the current round and config. */
  getNextRound(currentRound: number, blockConfig: BlockConfig): number;

  /** Whether the block should automatically stop when its condition is met. */
  shouldAutoStop(): boolean;
}

// ─── Straight Set Strategy ───────────────────────────────────────────────

class StraightSetStrategy implements BlockTypeStrategy {
  getMaxSets(blockConfig: BlockConfig): number {
    return blockConfig.rounds ?? 3;
  }

  getAdditionalFields(): string[] {
    return [];
  }

  validateSet(set: { reps?: number; weight?: number; round?: number }): string | null {
    if (set.reps !== undefined && (!Number.isInteger(set.reps) || set.reps < 0)) {
      return "Reps must be a non-negative integer";
    }
    if (set.weight !== undefined && set.weight < 0) {
      return "Weight must be non-negative";
    }
    return null;
  }

  getNextRound(currentRound: number, _blockConfig: BlockConfig): number {
    return currentRound + 1;
  }

  shouldAutoStop(): boolean {
    return false;
  }
}

// ─── AMRAP Strategy ──────────────────────────────────────────────────────

class AMRAPStrategy implements BlockTypeStrategy {
  getMaxSets(_blockConfig: BlockConfig): number {
    return Infinity;
  }

  getAdditionalFields(): string[] {
    return ["timerRemaining"];
  }

  validateSet(set: { reps?: number; weight?: number; round?: number }): string | null {
    if (set.reps !== undefined && (!Number.isInteger(set.reps) || set.reps < 0)) {
      return "Reps must be a non-negative integer";
    }
    if (set.weight !== undefined && set.weight < 0) {
      return "Weight must be non-negative";
    }
    return null;
  }

  getNextRound(currentRound: number, _blockConfig: BlockConfig): number {
    return currentRound + 1;
  }

  shouldAutoStop(): boolean {
    return true;
  }
}

// ─── EMOM Strategy ───────────────────────────────────────────────────────

class EMOMStrategy implements BlockTypeStrategy {
  getMaxSets(_blockConfig: BlockConfig): number {
    return Infinity;
  }

  getAdditionalFields(): string[] {
    return ["round"];
  }

  validateSet(set: { reps?: number; weight?: number; round?: number }): string | null {
    if (set.reps !== undefined && (!Number.isInteger(set.reps) || set.reps < 0)) {
      return "Reps must be a non-negative integer";
    }
    if (set.weight !== undefined && set.weight < 0) {
      return "Weight must be non-negative";
    }
    if (set.round !== undefined && (!Number.isInteger(set.round) || set.round < 1)) {
      return "Round must be a positive integer";
    }
    return null;
  }

  getNextRound(currentRound: number, _blockConfig: BlockConfig): number {
    return currentRound + 1;
  }

  shouldAutoStop(): boolean {
    return true;
  }
}

// ─── Circuit Strategy ────────────────────────────────────────────────────

class CircuitStrategy implements BlockTypeStrategy {
  getMaxSets(_blockConfig: BlockConfig): number {
    return Infinity;
  }

  getAdditionalFields(): string[] {
    return ["round"];
  }

  validateSet(set: { reps?: number; weight?: number; round?: number }): string | null {
    if (set.reps !== undefined && (!Number.isInteger(set.reps) || set.reps < 0)) {
      return "Reps must be a non-negative integer";
    }
    if (set.weight !== undefined && set.weight < 0) {
      return "Weight must be non-negative";
    }
    if (set.round !== undefined && (!Number.isInteger(set.round) || set.round < 1)) {
      return "Round must be a positive integer";
    }
    return null;
  }

  getNextRound(currentRound: number, blockConfig: BlockConfig): number {
    // In a circuit, a round completes when all exercises have been done.
    // If exercises are configured, only increment when the cycle is complete.
    const exerciseCount = blockConfig.exercises?.length ?? 0;
    if (exerciseCount > 0 && currentRound % exerciseCount !== 0) {
      // Stay within the current cycle — increment the sub-round
      return currentRound + 1;
    }
    // Start a new full round
    return currentRound + 1;
  }

  shouldAutoStop(): boolean {
    return false;
  }
}

// ─── Strategy Instances ──────────────────────────────────────────────────

const strategyMap: Record<BlockType, BlockTypeStrategy> = {
  straight_set: new StraightSetStrategy(),
  amrap: new AMRAPStrategy(),
  emom: new EMOMStrategy(),
  circuit: new CircuitStrategy(),
};

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * Get the strategy implementation for a given block type.
 * Falls back to `straight_set` for unknown types.
 */
export function getBlockTypeStrategy(blockType: BlockType): BlockTypeStrategy {
  return strategyMap[blockType] ?? strategyMap.straight_set;
}
