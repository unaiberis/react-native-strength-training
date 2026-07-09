import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

// ─── Types ─────────────────────────────────────────────────────────────────

const UNIT_PREF_KEY = "weight_unit";
export type WeightUnit = "kg" | "lbs";

interface UseUnitPreferencesReturn {
  /** The current weight unit preference. Defaults to "kg". */
  unit: WeightUnit;
  /** Whether the persisted value has been loaded from storage. */
  isLoaded: boolean;
  /** Update the weight unit preference and persist it. */
  setUnit: (unit: WeightUnit) => Promise<void>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Read and persist the user's weight unit preference (kg / lbs).
 *
 * Uses expo-secure-store for persistence. The preference is loaded
 * once on mount. Returns a setter that persists immediately.
 *
 * Defaults to "kg" when no value is stored yet.
 */
export function useUnitPreferences(): UseUnitPreferencesReturn {
  const [unit, setUnitState] = useState<WeightUnit>("kg");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(UNIT_PREF_KEY)
      .then((value) => {
        if (value === "kg" || value === "lbs") {
          setUnitState(value);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        // SecureStore not available (e.g. web) — use default
        setIsLoaded(true);
      });
  }, []);

  const setUnit = useCallback(async (newUnit: WeightUnit) => {
    setUnitState(newUnit);
    try {
      await SecureStore.setItemAsync(UNIT_PREF_KEY, newUnit);
    } catch {
      // Silently fail on web — preference still works for the session
    }
  }, []);

  return { unit, setUnit, isLoaded };
}
