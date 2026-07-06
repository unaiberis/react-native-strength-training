import { useState, useCallback } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useLingui } from "@lingui/react/macro";
import { Button } from "./Button";

interface AmrapResultInputProps {
  /** Called when the user submits the AMRAP result */
  onSubmit: (result: { rounds: number; partialReps: number }) => void;
  /** Whether to show loading state */
  loading?: boolean;
}

/**
 * AMRAP result input component.
 *
 * Shown after an AMRAP block completes (time runs out or user finishes).
 * Captures total completed rounds and partial reps in the final round.
 */
export function AmrapResultInput({ onSubmit, loading }: AmrapResultInputProps) {
  const { t } = useLingui();
  const [rounds, setRounds] = useState("");
  const [partialReps, setPartialReps] = useState("");

  const handleSubmit = useCallback(() => {
    const r = parseInt(rounds, 10);
    const pr = parseInt(partialReps, 10);

    if (isNaN(r) || r < 0) {
      Alert.alert(t`Validation`, t`Enter a valid number of rounds.`);
      return;
    }

    onSubmit({ rounds: r, partialReps: isNaN(pr) ? 0 : pr });
  }, [rounds, partialReps, onSubmit, t]);

  return (
    <View className="bg-card rounded-2xl border border-border p-4 gap-4">
      <Text className="text-surface-100 text-sm font-semibold">
        {t`AMRAP Complete`}
      </Text>
      <Text className="text-surface-400 text-xs">
        {t`Enter the total rounds and partial reps you completed.`}
      </Text>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">
            {t`Total Rounds`}
          </Text>
          <TextInput
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#52525b"
            value={rounds}
            onChangeText={setRounds}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
        <View className="flex-1">
          <Text className="text-surface-400 text-xs mb-1">
            {t`Partial Reps`}
          </Text>
          <TextInput
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#52525b"
            value={partialReps}
            onChangeText={setPartialReps}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-surface-100 text-sm"
          />
        </View>
      </View>

      <Button
        title={t`Save Result`}
        variant="primary"
        onPress={handleSubmit}
        loading={loading}
      />
    </View>
  );
}
