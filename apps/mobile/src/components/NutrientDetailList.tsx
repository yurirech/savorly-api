import { StyleSheet, View } from "react-native";

import {
  formatNutrientAmount,
  type PresentNutrientGroup,
} from "@savorly/shared";

import { AppText } from "./AppText";
import { tokens } from "../theme/tokens";

interface NutrientDetailListProps {
  groups: PresentNutrientGroup[];
}

function NutrientDetailList(props: NutrientDetailListProps) {
  const { groups } = props;

  return (
    <>
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <AppText variant="title">{group.labelKey}</AppText>
          {group.rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <AppText variant="body" color="muted">
                {row.labelKey}
              </AppText>
              <AppText variant="body">{formatNutrientAmount(row.value, row.unit)}</AppText>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: tokens.space.sm,
    marginTop: tokens.space.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: tokens.space.xs,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
});

export default NutrientDetailList;
