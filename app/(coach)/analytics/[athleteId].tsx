import { useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase/client";
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

  // Wellness data for this athlete
  const { data: wellnessData } = useQuery({
    queryKey: ["coach-wellness", athleteId],
    queryFn: async () => {
      const records = await pb.collection("daily_wellness").getList(1, 200, {
        filter: `user_id = '${athleteId}'`,
        sort: "-date",
        $autoCancel: false,
      });
      return records as unknown as Array<{
        session_rpe: number | null;
        sleep: number | null;
        fatigue: number | null;
        soreness: number | null;
        mood: number | null;
        date: string;
      }>;
    },
    enabled: !!athleteId,
    staleTime: 1000 * 60 * 2,
  });

  const wellnessAverages = useMemo(() => {
    if (!wellnessData || wellnessData.length === 0) return null;
    const recent = wellnessData.slice(0, 7);
    const avg = (key: "sleep" | "fatigue" | "soreness" | "mood") => {
      const vals = recent.map((r) => r[key]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const overall = (key: "sleep" | "fatigue" | "soreness" | "mood") => {
      const vals = wellnessData.map((r) => r[key]).filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      recentSleep: avg("sleep"), recentFatigue: avg("fatigue"),
      recentSoreness: avg("soreness"), recentMood: avg("mood"),
      overallSleep: overall("sleep"), overallFatigue: overall("fatigue"),
      overallSoreness: overall("soreness"), overallMood: overall("mood"),
    };
  }, [wellnessData]);

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
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#050505" }}
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

        {/* Wellness */}
        <DataCard title="Wellness (Last 7 Days)">
          {!wellnessAverages ? (
            <View className="py-8 items-center">
              <Text className="text-surface-400 text-sm">No wellness data</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-4">
              {[
                { label: "Sleep", value: wellnessAverages.recentSleep, unit: "h", good: (v: number) => v >= 7 },
                { label: "Fatigue", value: wellnessAverages.recentFatigue, unit: "/10", good: (v: number) => v <= 4 },
                { label: "Soreness", value: wellnessAverages.recentSoreness, unit: "/10", good: (v: number) => v <= 4 },
                { label: "Mood", value: wellnessAverages.recentMood, unit: "/10", good: (v: number) => v >= 5 },
              ].map((metric) => (
                <View key={metric.label} className="flex-1 min-w-[80px] bg-graphite/30 rounded-xl p-3 items-center">
                  <Text className="text-surface-400 text-xs mb-1">{metric.label}</Text>
                  <Text className={`text-xl font-bold ${metric.value !== null && metric.good(metric.value) ? "text-green-400" : "text-danger"}`}>
                    {metric.value !== null ? metric.value.toFixed(1) : "—"}
                  </Text>
                  <Text className="text-surface-500 text-[10px]">{metric.unit}</Text>
                </View>
              ))}
            </View>
          )}
        </DataCard>
      </ScrollView>
    </>
  );
}
