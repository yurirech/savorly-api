import { describe, expect, it } from "vitest";
import { detectVideoImportType, normalizeVideoImportUrl } from "./videoImport";

describe("detectVideoImportType", () => {
  it("accepts Instagram Reel and post URLs", () => {
    expect(detectVideoImportType("https://www.instagram.com/reel/DE7nUBBRP9-/?hl=en")).toBe("instagram");
    expect(detectVideoImportType("https://instagram.com/reels/abc123/")).toBe("instagram");
    expect(detectVideoImportType("https://www.instagram.com/p/xyz/")).toBe("instagram");
  });

  it("rejects Instagram profile URLs", () => {
    expect(detectVideoImportType("https://www.instagram.com/humansofny/")).toBeNull();
  });

  it("accepts YouTube watch, Shorts, and youtu.be URLs", () => {
    expect(detectVideoImportType("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
    expect(detectVideoImportType("https://youtube.com/shorts/abc123xyz")).toBe("youtube");
    expect(detectVideoImportType("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(detectVideoImportType("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
  });

  it("accepts URLs without a protocol", () => {
    expect(detectVideoImportType("youtube.com/shorts/abc123xyz")).toBe("youtube");
    expect(detectVideoImportType("www.instagram.com/reel/abc/")).toBe("instagram");
  });

  it("rejects channels, playlists, and other sites", () => {
    expect(detectVideoImportType("https://www.youtube.com/@channel")).toBeNull();
    expect(detectVideoImportType("https://www.youtube.com/playlist?list=PLxxx")).toBeNull();
    expect(detectVideoImportType("https://example.com/watch?v=abc")).toBeNull();
  });
});

describe("normalizeVideoImportUrl", () => {
  it("adds https when the protocol is missing", () => {
    expect(normalizeVideoImportUrl("youtu.be/dQw4w9WgXcQ")).toBe("https://youtu.be/dQw4w9WgXcQ");
  });
});
