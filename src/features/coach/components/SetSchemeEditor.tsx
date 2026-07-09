/**
 * SetSchemeEditor — Visual editor for set/rep schemes
 *
 * Supports straight sets, pyramids, ranges, AMRAP, warmup sets,
 * RPE targets, weight type selectors, and per-set configuration.
 *
 * Each set renders as a Card row with:
 *   - Set number
 *   - Reps input (or range: min-max)
 *   - RPE input (optional, 1-10)
 *   - %1RM input (optional)
 *   - Weight type selector: absolute | %1RM | RPE-based
 *   - "Is warmup" toggle
 *   - Remove button
 *
 * "Add Set" button at bottom.
 * "AMRAP" quick toggle for the last set.
 * Total volume estimate displayed at bottom.
 */

import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/shared/ui/Card";

// ─── Types ───────────────────────────────────────────────────────────────

export type WeightType = "absolute" | "percent_1rm" | "rpe_based";

export interface SetEntry {
  key: string;
  reps: number;
  repsMin: number | null;
  repsMax: number | null;
  rpe: number | null;
  weightType: WeightType;
  weightValue: number | null;
  isWarmup: boolean;
  isAmrap: boolean;
}

export interface SetSchemeEditorProps {
  sets: SetEntry[];
  onChange: (sets: SetEntry[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

let _setKeyCounter = 0;

export function createSetEntry(overrides?: Partial<SetEntry>): SetEntry {
  _setKeyCounter += 1;
  return {
    key: `set-${_setKeyCounter}-${Date.now()}`,
    reps: 8,
    repsMin: null,
    repsMax: null,
    rpe: null,
    weightType: "absolute",
    weightValue: null,
    isWarmup: false,
    isAmrap: false,
    ...overrides,
  };
}

export function createDefaultSets(count = 3): SetEntry[] {
  return Array.from({ length: count }, (_, i) =>
    createSetEntry({ reps: 10, isWarmup: i === 0 }),
  );
}

// ─── Weight Type Labels ──────────────────────────────────────────────────

const WEIGHT_TYPE_LABELS: Record<WeightType, string> = {
  absolute: "Abs",
  percent_1rm: "%1RM",
  rpe_based: "RPE",
};

const WEIGHT_TYPE_OPTIONS: WeightType[] = ["absolute", "percent_1rm", "rpe_based"];

// ─── Component ───────────────────────────────────────────────────────────

export function SetSchemeEditor({ sets, onChange }: SetSchemeEditorProps) {
  const handleUpdate = useCallback(
    (index: number, updates: Partial<SetEntry>) => {
      onChange(
        sets.map((set, i) => (i === index ? { ...set, ...updates } : set)),
      );
    },
    [sets, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(sets.filter((_, i) => i !== index));
    },
    [sets, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...sets, createSetEntry()]);
  }, [sets, onChange]);

  const handleToggleLastAmrap = useCallback(() => {
    const lastIndex = sets.length - 1;
    if (lastIndex < 0) return;
    handleUpdate(lastIndex, { isAmrap: !sets[lastIndex].isAmrap });
  }, [sets, handleUpdate]);

  const totalVolume = useMemo(
    () => sets.reduce((sum, set) => sum + (set.isAmrap ? 0 : set.reps), 0),
    [sets],
  );

  const anyAmrap = useMemo(() => sets.some((s) => s.isAmrap), [sets]);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-surface-50 text-base font-semibold">
          Set Scheme
        </Text>
        <Text className="text-surface-500 text-xs">
          {sets.length} set{sets.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {sets.length === 0 && (
        <Card variant="soft" className="mb-3">
          <Text className="text-surface-400 text-sm text-center py-2">
            No sets configured. Tap "Add Set" below.
          </Text>
        </Card>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3 -mx-1"
      >
        {sets.map((set, index) => (
          <View
            key={set.key}
            className="bg-card border border-border rounded-xl p-3 mr-2 min-w-[200px] max-w-[220px]"
          >
            {/* Set header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-surface-500 text-xs font-mono">
                  #{index + 1}
                </Text>
                {set.isWarmup && (
                  <View className="bg-amber-500/20 px-1.5 py-0.5 rounded">
                    <Text className="text-amber-400 text-[10px] font-bold uppercase">
                      Warmup
                    </Text>
                  </View>
                )}
                {set.isAmrap && (
                  <View className="bg-purple-500/20 px-1.5 py-0.5 rounded">
                    <Text className="text-purple-400 text-[10px] font-bold uppercase">
                      AMRAP
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(index)}
                className="p-1"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Remove set ${index + 1}`}
              >
                <Ionicons name="close-circle" size={18} color="#D65F5F" />
              </TouchableOpacity>
            </View>

            {/* Reps input */}
            <View className="mb-2">
              <Text className="text-surface-400 text-[10px] font-semibold uppercase tracking-wide mb-1">
                {set.isAmrap ? "Target Reps+" : "Reps"}
              </Text>
              <View className="flex-row items-center gap-1">
                <TextInput
                  keyboardType="number-pad"
                  value={String(set.reps)}
                  onChangeText={(text) =>
                    handleUpdate(index, { reps: parseInt(text, 10) || 1 })
                  }
                  className="bg-graphite rounded-lg px-3 py-2 text-surface-50 text-sm flex-1 text-center"
                />
                {set.repsMin != null && set.repsMax != null && (
                  <>
                    <Text className="text-surface-500 text-xs">–</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={String(set.repsMax)}
                      onChangeText={(text) =>
                        handleUpdate(index, {
                          repsMax: parseInt(text, 10) || 1,
                        })
                      }
                      className="bg-graphite rounded-lg px-3 py-2 text-surface-50 text-sm flex-1 text-center"
                    />
                  </>
                )}
              </View>
            </View>

            {/* RPE input */}
            <View className="mb-2">
              <Text className="text-surface-400 text-[10px] font-semibold uppercase tracking-wide mb-1">
                RPE
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                value={set.rpe != null ? String(set.rpe) : ""}
                onChangeText={(text) =>
                  handleUpdate(index, {
                    rpe: text ? Math.min(10, Math.max(1, parseFloat(text))) : null,
                  })
                }
                placeholder="—"
                placeholderTextColor="#52525b"
                className="bg-graphite rounded-lg px-3 py-2 text-surface-50 text-sm text-center"
              />
            </View>

            {/* Weight type selector */}
            <View className="mb-2">
              <Text className="text-surface-400 text-[10px] font-semibold uppercase tracking-wide mb-1">
                Weight
              </Text>
              <View className="flex-row gap-1">
                {WEIGHT_TYPE_OPTIONS.map((wt) => (
                  <TouchableOpacity
                    key={wt}
                    onPress={() => handleUpdate(index, { weightType: wt })}
                    className={`px-2 py-1 rounded-md flex-1 items-center ${
                      set.weightType === wt
                        ? "bg-titanium"
                        : "bg-graphite"
                    }`}
                    accessibilityLabel={`Weight type: ${wt}`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        set.weightType === wt
                          ? "text-background"
                          : "text-surface-400"
                      }`}
                    >
                      {WEIGHT_TYPE_LABELS[wt]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Warmup toggle */}
            <TouchableOpacity
              onPress={() =>
                handleUpdate(index, {
                  isWarmup: !set.isWarmup,
                  isAmrap: set.isWarmup ? false : set.isAmrap,
                })
              }
              className={`flex-row items-center gap-2 py-1.5 px-2 rounded-lg ${
                set.isWarmup ? "bg-amber-500/10" : "bg-graphite"
              }`}
              accessibilityLabel={`Toggle warmup for set ${index + 1}`}
            >
              <View
                className={`w-4 h-4 rounded border-2 items-center justify-center ${
                  set.isWarmup
                    ? "bg-amber-500 border-amber-500"
                    : "border-surface-500"
                }`}
              >
                {set.isWarmup && (
                  <Ionicons name="checkmark" size={12} color="#050505" />
                )}
              </View>
              <Text
                className={`text-xs ${
                  set.isWarmup ? "text-amber-400" : "text-surface-400"
                }`}
              >
                Warmup
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add Set + AMRAP row */}
      <View className="flex-row gap-2 mb-3">
        <TouchableOpacity
          onPress={handleAdd}
          className="flex-1 border-2 border-dashed border-border rounded-xl py-3 items-center flex-row justify-center gap-2 active:opacity-70"
          accessibilityLabel="Add set"
        >
          <Ionicons name="add" size={18} color="#B9B9B6" />
          <Text className="text-titanium text-sm font-medium">Add Set</Text>
        </TouchableOpacity>

        {sets.length > 0 && (
          <TouchableOpacity
            onPress={handleToggleLastAmrap}
            className={`px-4 rounded-xl items-center justify-center flex-row gap-1.5 ${
              anyAmrap ? "bg-purple-500/20 border border-purple-500/30" : "bg-graphite"
            }`}
            accessibilityLabel="Toggle AMRAP for last set"
          >
            <Ionicons
              name="flame-outline"
              size={16}
              color={anyAmrap ? "#a78bfa" : "#707074"}
            />
            <Text
              className={`text-xs font-bold ${
                anyAmrap ? "text-purple-400" : "text-surface-400"
              }`}
            >
              AMRAP
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Volume estimate */}
      <View className="bg-graphite rounded-xl px-4 py-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="analytics-outline" size={14} color="#707074" />
          <Text className="text-surface-400 text-xs">Total Volume Estimate</Text>
        </View>
        <Text className="text-surface-50 text-sm font-bold">
          ~{totalVolume} rep{totalVolume !== 1 ? "s" : ""}
        </Text>
      </View>
    </View>
  );
}
