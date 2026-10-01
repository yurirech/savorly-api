export type VideoImportType = "instagram" | "youtube";

export function detectVideoImportType(rawUrl: string): VideoImportType | null {
  const url = parseLooseHttpUrl(rawUrl);
  if (!url) {
    return null;
  }
  if (isInstagramReelUrl(url)) {
    return "instagram";
  }
  if (isYouTubeVideoUrl(url)) {
    return "youtube";
  }
  return null;
}

export function normalizeVideoImportUrl(rawUrl: string): string | null {
  return parseLooseHttpUrl(rawUrl)?.href ?? null;
}

function parseLooseHttpUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }
  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function hostname(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

function isInstagramReelUrl(url: URL): boolean {
  const host = hostname(url);
  if (host !== "instagram.com" && host !== "instagr.am") {
    return false;
  }
  return /\/(reel|reels|p)\//i.test(url.pathname);
}

function isYouTubeVideoUrl(url: URL): boolean {
  const host = hostname(url).replace(/^m\./, "");
  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean).length >= 1;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") {
    return false;
  }
  if (/^\/(shorts|embed|live)\/[^/]+/i.test(url.pathname)) {
    return true;
  }
  return url.pathname === "/watch" && Boolean(url.searchParams.get("v"));
}
