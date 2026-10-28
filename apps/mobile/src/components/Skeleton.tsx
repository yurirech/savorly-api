import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { tokens } from "../theme/tokens";
import { useThemedStyles, type ThemeColors } from "../theme/theme";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function Skeleton(props: SkeletonProps) {
  const styles = useThemedStyles(createStyles);

  const { width = "100%", height = 16, radius = tokens.radius.md, style } = props;
  return <View style={[styles.block, { width, height, borderRadius: radius }, style]} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  block: {
    backgroundColor: colors.surface,
  },
});
}


export default Skeleton;
