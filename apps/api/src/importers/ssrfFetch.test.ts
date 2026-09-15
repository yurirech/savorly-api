import { describe, expect, it } from "vitest";
import { AppError } from "../errors";
import { isBlockedIpLiteral, parsePublicHttpUrl } from "./ssrfFetch";

describe("ssrfFetch", () => {
  it("allows public http and https URLs", () => {
    expect(parsePublicHttpUrl("https://www.seriouseats.com/recipe").protocol).toBe("https:");
    expect(parsePublicHttpUrl("http://example.com/soup").hostname).toBe("example.com");
  });

  it("rejects non-http schemes and credentials", () => {
    expect(() => parsePublicHttpUrl("file:///etc/passwd")).toThrow(AppError);
    expect(() => parsePublicHttpUrl("https://user:pass@example.com")).toThrow(AppError);
    expect(() => parsePublicHttpUrl("not a url")).toThrow(AppError);
  });

  it("blocks loopback, private, link-local and metadata addresses", () => {
    expect(isBlockedIpLiteral("127.0.0.1")).toBe(true);
    expect(isBlockedIpLiteral("10.0.0.4")).toBe(true);
    expect(isBlockedIpLiteral("192.168.1.1")).toBe(true);
    expect(isBlockedIpLiteral("172.16.0.2")).toBe(true);
    expect(isBlockedIpLiteral("169.254.169.254")).toBe(true);
    expect(isBlockedIpLiteral("::1")).toBe(true);
    expect(isBlockedIpLiteral("fd12:3456:789a::1")).toBe(true);
    expect(isBlockedIpLiteral("8.8.8.8")).toBe(false);
  });
});
