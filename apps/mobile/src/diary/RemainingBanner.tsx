import { Pressable, StyleSheet } from "react-native";
import type { DiaryDayResponse } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";

interface RemainingBannerProps {
  remaining: DiaryDayResponse["remaining"];
  totalsKcal: number | null;
  targetKcal: number | null;
  onPress?: () => void;
}

function RemainingBanner(props: RemainingBannerProps) {
  const { remaining, totalsKcal, targetKcal, onPress } = props;
  const hasTargets = targetKcal != null;

  return (
    <>
      {hasTargets ? (
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel="Remaining calories"
          style={styles.card}
        >
          <AppText variant="label" color="muted">
            Remaining
          </AppText>
          <AppText variant="display">{remaining ? `${remaining.kcal} kcal` : "—"}</AppText>
          <AppText variant="caption" color="muted">
            {remaining
              ? `${remaining.proteinG}g protein · ${remaining.carbsG}g carbs · ${remaining.fatG}g fat`
              : "Set a profile to see targets."}
          </AppText>
          {totalsKcal != null ? (
            <AppText variant="caption" color="muted">
              Logged {totalsKcal} / {targetKcal} kcal
            </AppText>
          ) : null}
        </Pressable>
      ) : null}
      {!hasTargets ? (
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel="Set a profile"
        >
          <AppText variant="body" color="muted">
            Set your height, weight, and goal so remaining calories have something to chase.
          </AppText>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
});

export default RemainingBanner;
