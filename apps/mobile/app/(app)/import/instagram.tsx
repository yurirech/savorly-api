import { ImportForm } from "../../../src/components/ImportForm";

export default function InstagramImportScreen() {
  return (
    <ImportForm
      title="Instagram Reel"
      subtitle="Paste a public Reel URL. We keep the caption and transcript, never the video."
      label="Reel URL"
      placeholder="https://www.instagram.com/reel/..."
      keyboardType="url"
      buildRequest={(url) => ({ type: "instagram", url })}
    />
  );
}
