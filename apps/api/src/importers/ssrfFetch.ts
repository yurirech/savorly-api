import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { AppError } from "../errors";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
]);

const BLOCKED_HOST_SUFFIXES = [".internal", ".local", ".localhost"];

const MAX_REDIRECTS = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/ld+json",
];

export type SafeFetchResult = {
  url: string;
  contentType: string;
  body: string;
};

export async function fetchPublicHttpUrl(rawUrl: string): Promise<SafeFetchResult> {
  let current = parsePublicHttpUrl(rawUrl);
  await assertPublicHost(current);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SavorlyRecipeImporter/1.0",
          Accept: "text/html,application/xhtml+xml,application/ld+json;q=0.9",
        },
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new AppError("upstream_timeout", "The webpage took too long to respond.", 504, true);
      }
      throw new AppError("import_blocked", "Could not fetch this webpage.", 502, true);
    } finally {
      clearTimeout(timer);
    }

    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new AppError("import_blocked", "The webpage redirected without a destination.", 502, true);
      }
      current = parsePublicHttpUrl(new URL(location, current).href);
      await assertPublicHost(current);
      continue;
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new AppError(
        "import_blocked",
        "This website blocked automated retrieval. Paste the recipe text instead.",
        422,
        true,
      );
    }

    if (!response.ok) {
      throw new AppError(
        "import_blocked",
        `The webpage returned ${response.status}. Paste the recipe text instead.`,
        422,
        true,
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.some((allowed) => contentType.startsWith(allowed))) {
      throw new AppError(
        "unsupported_content_type",
        "This URL is not a supported webpage type.",
        422,
        true,
      );
    }

    const body = await readLimitedBody(response);
    return { url: current.href, contentType, body };
  }

  throw new AppError("ssrf_rejected", "Too many redirects.", 400, true);
}

export function parsePublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError("validation_error", "Enter a valid URL.", 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("ssrf_rejected", "Only public HTTP and HTTPS URLs are allowed.", 400);
  }

  if (parsed.username || parsed.password) {
    throw new AppError("ssrf_rejected", "URLs with credentials are not allowed.", 400);
  }

  return parsed;
}

export async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new AppError("ssrf_rejected", "Internal hostnames are not allowed.", 400);
  }

  if (isBlockedIpLiteral(hostname)) {
    throw new AppError("ssrf_rejected", "Private or local addresses are not allowed.", 400);
  }

  let records: { address: string }[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError("import_blocked", "Could not resolve this website.", 422, true);
  }

  if (records.length === 0 || records.some((record) => isBlockedIpLiteral(record.address))) {
    throw new AppError("ssrf_rejected", "Private or local addresses are not allowed.", 400);
  }
}

export function isBlockedIpLiteral(value: string): boolean {
  const ip = normalizeIp(value);
  if (!isIP(ip)) {
    return false;
  }

  if (isIP(ip) === 4) {
    return isBlockedIpv4(ip);
  }

  return isBlockedIpv6(ip);
}

function normalizeIp(value: string): string {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }
  if (value.startsWith("::ffff:")) {
    return value.slice(7);
  }
  return value;
}

function isBlockedIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (ip === "255.255.255.255") return true;
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("ff")) return true;
  return false;
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readLimitedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    throw new AppError("import_blocked", "The webpage is too large to import.", 422, true);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BYTES) {
      await reader.cancel();
      throw new AppError("import_blocked", "The webpage is too large to import.", 422, true);
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
