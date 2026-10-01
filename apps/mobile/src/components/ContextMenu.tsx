import type { RefObject } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { tokens } from "../theme/tokens";

export type ContextMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ContextMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

interface ContextMenuProps {
  visible: boolean;
  anchor: ContextMenuAnchor | null;
  onClose: () => void;
  items: ContextMenuItem[];
}

export function measureContextMenuAnchor(
  ref: RefObject<View | null>,
  onMeasured: (anchor: ContextMenuAnchor) => void,
) {
  ref.current?.measureInWindow((x, y, width, height) => {
    onMeasured({ x, y, width, height });
  });
}

function ContextMenu(props: ContextMenuProps) {
  const { visible, anchor, onClose, items } = props;

  if (!visible || !anchor) {
    return null;
  }

  const windowWidth = Dimensions.get("window").width;
  const panelTop = anchor.y + anchor.height + tokens.space.xs;
  const panelRight = windowWidth - (anchor.x + anchor.width);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={[styles.panel, tokens.shadow.card, { top: panelTop, right: panelRight }]}>
          {items.map((item, index) => (
            <View key={item.label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={() => {
                  if (item.disabled) {
                    return;
                  }
                  onClose();
                  item.onPress();
                }}
                disabled={item.disabled}
                style={styles.row}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <AppText variant="body" color={item.destructive ? "danger" : "text"}>
                  {item.label}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    minWidth: 220,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border,
  },
});

export default ContextMenu;
