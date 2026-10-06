import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { tokens } from "../theme/tokens";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function Skeleton(props: SkeletonProps) {
  const { width = "100%", height = 16, radius = tokens.radius.md, style } = props;
  return <View style={[styles.block, { width, height, borderRadius: radius }, style]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: tokens.surface,
  },
});

export default Skeleton;
