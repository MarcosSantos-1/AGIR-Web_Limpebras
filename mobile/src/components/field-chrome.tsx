import { Chip } from "heroui-native";
import { ScrollView, Text, View } from "react-native";
import { SUB_FILTERS, useWorkspace } from "@/features/workspace";
import type { SubFilter } from "@/features/format";

export function SubFilterBar({ mode = "pending" }: { mode?: "pending" | "done" }) {
  const { subFilter, setSubFilter, counts, doneCounts } = useWorkspace();
  const source = mode === "done" ? doneCounts : counts;
  const noun = mode === "done" ? "concluídos" : "pendentes";
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, maxHeight: 56 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20, alignItems: "center" }}
      accessibilityRole="tablist"
    >
      {SUB_FILTERS.map((item) => {
        const selected = subFilter === item.id;
        const label = `${item.label}, ${source[item.id]} ${noun}`;
        return (
          <Chip
            key={item.id}
            size="lg"
            variant={selected ? "primary" : "soft"}
            color={selected ? "accent" : "default"}
            className="min-h-12"
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => setSubFilter(item.id as SubFilter)}
          >
            {item.label} {source[item.id]}
          </Chip>
        );
      })}
    </ScrollView>
  );
}

export function Notice({ tone, children }: { tone: "danger" | "warning"; children: string }) {
  const palette = tone === "danger" ? "bg-danger/10 text-danger" : "bg-warning/15 text-foreground";
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className={`mx-5 rounded-2xl px-4 py-3 text-sm leading-5 ${palette}`}>
      {children}
    </Text>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View className="mx-5 mt-8 items-center rounded-3xl bg-surface px-6 py-10">
      <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted">{body}</Text>
    </View>
  );
}
