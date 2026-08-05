import { beforeAll, describe, expect, it } from "vitest";

import { installChromeMock } from "./helpers/chrome-mock.js";

/*
 * background.js registers its listeners at import time, so the chrome mock has
 * to exist first. Only the pure helpers are asserted here; the orchestration
 * paths need a real browser and belong in the end-to-end suite.
 */

let background;

beforeAll(async () => {
  installChromeMock();

  background = await import("../extension/background.js");
});

describe("wallTimeFor", () => {
  it("maps monotonic CDP seconds onto wall time", () => {
    const now = 1_700_000_000_000;

    /*
     * CDP hands out monotonic seconds since an arbitrary origin. Anchoring the
     * first sample means later events keep their real spacing instead of all
     * collapsing onto arrival time.
     */
    const first = background.wallTimeFor(1, 5_000.0, now);

    expect(first).toBe(now);

    const later = background.wallTimeFor(1, 5_002.5, now + 2_500);

    expect(later).toBe(now + 2_500);
  });

  it("preserves ordering between two events in one burst", () => {
    const now = 1_700_000_000_000;

    background.wallTimeFor(2, 1_000, now);

    const a = background.wallTimeFor(2, 1_000.1, now);
    const b = background.wallTimeFor(2, 1_000.4, now);

    expect(b).toBeGreaterThan(a);
  });

  it("falls back to now for a missing or bogus timestamp", () => {
    const now = 1_700_000_000_000;

    expect(background.wallTimeFor(3, undefined, now)).toBe(now);
    expect(background.wallTimeFor(3, NaN, now)).toBe(now);
    expect(background.wallTimeFor(3, -1, now)).toBe(now);
  });

  it("refuses to report a time in the future", () => {
    const now = 1_700_000_000_000;

    /* Anchor, then feed a wildly larger monotonic value. */
    background.wallTimeFor(4, 100, now);

    expect(
      background.wallTimeFor(4, 999_999, now)
    ).toBeLessThanOrEqual(now + 1000);
  });
});

describe("describeResponse", () => {
  it("keeps diagnostics and drops credentials", () => {
    const described = background.describeResponse({
      url: "https://api.example.com/plans",
      status: 200,
      statusText: "OK",
      mimeType: "application/json",
      protocol: "h2",
      remoteIPAddress: "203.0.113.10",
      headers: {
        "content-type": "application/json",
        "set-cookie": "sid=abc123; HttpOnly",
        authorization: "Bearer abc.def.ghi"
      }
    });

    expect(described.status).toBe(200);
    expect(described.mimeType).toBe("application/json");
    expect(described.protocol).toBe("h2");
    expect(described.headers["content-type"]).toBe(
      "application/json"
    );

    expect(described.headers["set-cookie"]).toBe("[REDACTED]");
    expect(described.headers.authorization).toBe("[REDACTED]");
  });

  it("redacts secrets embedded in a response url", () => {
    const described = background.describeResponse({
      url: "https://api.example.com/x?token=kQ8mZr2xVt7bNw3pLc5yHd9f",
      status: 200,
      headers: {}
    });

    expect(described.url).not.toContain("kQ8mZr2xVt7bNw3pLc5yHd9f");
  });

  it("tolerates a missing response object", () => {
    expect(() => background.describeResponse(undefined)).not.toThrow();
  });
});
