import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCoachAnalytics } from "@/features/coach/hooks/useCoachAnalytics";

function SimpleBar({
  label,
  value,
  maxValue,
  color = "#B9B9B6",
}: {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-surface-400 text-xs">{label}</Text>
        <Text className="text-surface-50 text-xs font-semibold">
          {typeof value === "number" ? value.toFixed(1) : value}
        </Text>
      </View>
      <View className="h-3 bg-graphite rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-4">
      <Text className="text-surface-50 font-bold text-base mb-3">{title}</Text>
      {children}
    </View>
  );
}

export default function CoachAnalyticsScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { volumeData, complianceData, prEvolutionData, isLoading, refetch } =
    useCoachAnalytics(athleteId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#B9B9B6" />
      </View>
    );
  }

  const maxVolume =
    volumeData.length > 0
      ? Math.max(...volumeData.map((d) => d.totalVolumeKg))
      : 0;

  const maxCompliance =
    complianceData.length > 0
      ? Math.max(...complianceData.map((d) => d.rate))
      : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Analytics",
          headerStyle: { backgroundColor: "#050505" },
          headerTintColor: "#F4F4F2",
        }}
      />
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#B9B9B6"
          />
        }
      >
        {/* Volume chart */}
        <DataCard title="Volume Over Time">
          {volumeData.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-surface-400 text-sm">No volume data</Text>
            </View>
          ) : (
            volumeData.map((d) => (
              <SimpleBar
                key={d.date}
                label={new Date(d.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                value={d.totalVolumeKg}
                maxValue={maxVolume}
                color="#B9B9B6"
              />
            ))
          )}
        </DataCard>

        {/* Compliance chart */}
        <DataCard title="Weekly Compliance">
          {complianceData.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-surface-400 text-sm">No compliance data</Text>
            </View>
          ) : (
            complianceData.map((d) => (
              <SimpleBar
                key={d.weekStart}
                label={new Date(d.weekStart).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                value={d.rate * 100}
                maxValue={maxCompliance * 100 || 100}
                color={
                  d.rate >= 0.8
                    ? "#4ade80"
                    : d.rate >= 0.5
                      ? "#fbbf24"
                      : "#f87171"
                }
              />
            ))
          )}
        </DataCard>

        {/* PR Evolution */}
        <DataCard title="PR Evolution (e1RM)">
          {prEvolutionData.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-surface-400 text-sm">No PR data</Text>
            </View>
          ) : (
            <>
              {prEvolutionData.slice(-20).map((p, i) => (
                <View key={i} className="flex-row justify-between py-1.5">
                  <Text className="text-surface-400 text-xs flex-1">
                    {p.exerciseName}
                  </Text>
                  <Text className="text-surface-400 text-xs">
                    {new Date(p.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Text className="text-surface-50 text-xs font-semibold ml-3 w-16 text-right">
                    {p.value.toFixed(0)} kg
                  </Text>
                </View>
              ))}
            </>
          )}
        </DataCard>
      </ScrollView>
    </>
  );
}
