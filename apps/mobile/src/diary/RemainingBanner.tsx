import { Pressable, StyleSheet } from "react-native";
import { formatDiaryNumber, type DiaryDayResponse } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";
import { useThemedStyles, type ThemeColors } from "../theme/theme";

interface RemainingBannerProps {
  remaining: DiaryDayResponse["remaining"];
  totalsKcal: number | null;
  targetKcal: number | null;
  onPress?: () => void;
}

function RemainingBanner(props: RemainingBannerProps) {
  const styles = useThemedStyles(createStyles);

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
          <AppText variant="display">{remaining ? `${formatDiaryNumber(remaining.kcal)} kcal` : "—"}</AppText>
          <AppText variant="caption" color="muted">
            {remaining
              ? `${formatDiaryNumber(remaining.proteinG)}g protein · ${formatDiaryNumber(remaining.carbsG)}g carbs · ${formatDiaryNumber(remaining.fatG)}g fat`
              : "Set a profile to see targets."}
          </AppText>
          {totalsKcal != null ? (
            <AppText variant="caption" color="muted">
              Logged {formatDiaryNumber(totalsKcal)} / {formatDiaryNumber(targetKcal ?? 0)} kcal
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
});
}


export default RemainingBanner;
