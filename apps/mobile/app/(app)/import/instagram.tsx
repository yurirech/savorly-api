import { detectVideoImportType, normalizeVideoImportUrl } from "@savorly/shared";
import { ImportForm } from "../../../src/components/ImportForm";

export default function VideoImportScreen() {
  return (
    <ImportForm
      title="Instagram or YouTube"
      subtitle="Paste a public Instagram Reel or YouTube / Shorts URL. We keep the caption and transcript, never the video."
      label="Video URL"
      placeholder="https://www.instagram.com/reel/... or youtube.com/shorts/..."
      keyboardType="url"
      buildRequest={(rawUrl) => {
        const url = normalizeVideoImportUrl(rawUrl);
        const type = url ? detectVideoImportType(url) : null;
        if (!url || !type) {
          throw new Error("Paste a public Instagram Reel or YouTube / Shorts URL.");
        }
        return { type, url };
      }}
    />
  );
}
