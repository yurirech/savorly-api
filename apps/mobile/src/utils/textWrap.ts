const SOFT_BREAK = "\u200b";

export function softWrapText(text: string): string {
  return text
    .replace(/\s+/g, (space) => `${space}${SOFT_BREAK}`)
    .replace(/\//g, `/${SOFT_BREAK}`)
    .replace(/·/g, `·${SOFT_BREAK}`);
}

export function softWrapSegmentLabel(label: string): string {
  if (label.includes(" ")) {
    return label.replace(/ /g, ` ${SOFT_BREAK}`);
  }
  if (label.length >= 9) {
    const mid = Math.ceil(label.length / 2);
    return `${label.slice(0, mid)}${SOFT_BREAK}${label.slice(mid)}`;
  }
  return label;
}
