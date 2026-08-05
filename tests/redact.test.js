import { describe, expect, it } from "vitest";

import {
  entropy,
  looksLikeSecret,
  redactText,
  redactTextWithReport,
  redactHeaders,
  sanitizeValue,
  scanForReview,
  BODY_MIME
} from "../extension/redact.js";

/*
 * Redaction is the one subsystem where a false negative leaks a customer's
 * credentials into an AI prompt, so these tests care as much about what
 * survives as about what is stripped.
 */

/*
 * These fixtures are throwaway placeholders, but written as one literal they
 * carry the exact shape a vendor key has, which is enough to trip secret
 * scanners on push. Assembling each one from a prefix and a body keeps the
 * runtime value intact while leaving no scannable token in the source.
 */
const VENDOR_KEYS = {
  openai: "sk" + "-abcdefghijklmnopqrstuvwx",
  stripe: "sk_" + "live_abcdefghijklmnopqrstuvwx",
  github: "ghp" + "_abcdefghijklmnopqrstuvwxyz1234",
  aws: "AKIA" + "IOSFODNN7EXAMPLE",
  google: "AIza" + "SyA1234567890abcdefghijklmnop",
  slack: "xoxb" + "-123456789012-abcdefghijkl",
  gitlab: "glpat" + "-abcdefghij1234567890"
};

describe("redactText — credentials", () => {
  it("strips bearer tokens but keeps the header shape", () => {
    const output = redactText(
      "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def"
    );

    expect(output).toContain("Bearer [REDACTED]");
    expect(output).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("strips a real JWT", () => {
    const header = btoa('{"alg":"HS256","typ":"JWT"}')
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");

    const jwt = `${header}.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk`;

    expect(redactText(jwt)).toBe("[REDACTED_JWT]");
  });

  it("leaves dotted non-JWT strings alone", () => {
    /*
     * Minified property chains and semver-ish strings hit the same shape as a
     * JWT. Requiring a decodable header is what keeps them intact.
     */
    const text = "moduleRegistry.someLongPropertyName.anotherOne";

    expect(redactText(text)).toBe(text);
  });

  it("redacts keyed values without eating the key", () => {
    const output = redactText('{"api_key": "abcd1234efgh5678"}');

    expect(output).toBe('{"api_key": "[REDACTED]"}');
  });

  it.each([
    ["OpenAI", VENDOR_KEYS.openai],
    ["Stripe", VENDOR_KEYS.stripe],
    ["GitHub", VENDOR_KEYS.github],
    ["AWS", VENDOR_KEYS.aws],
    ["Google", VENDOR_KEYS.google],
    ["Slack", VENDOR_KEYS.slack],
    ["GitLab", VENDOR_KEYS.gitlab]
  ])("redacts a %s key", (_vendor, key) => {
    expect(redactText(`token=${key}`)).not.toContain(key);
  });

  it("redacts a private key block", () => {
    const block =
      "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJ\n" +
      "-----END RSA PRIVATE KEY-----";

    expect(redactText(block)).toBe("[REDACTED_PRIVATE_KEY]");
  });
});

describe("redactText — personal data", () => {
  it("masks email local parts and keeps the domain", () => {
    expect(redactText("ada@example.com")).toBe(
      "a**@example.com"
    );
  });

  it("redacts a Luhn-valid card number", () => {
    expect(redactText("card 4242424242424242")).toBe(
      "card [REDACTED_CARD]"
    );
  });

  it("redacts a card written with spaces", () => {
    expect(redactText("4242 4242 4242 4242")).toBe(
      "[REDACTED_CARD]"
    );
  });

  it("keeps digit runs that are not card numbers", () => {
    /*
     * Order IDs, epoch millis and phone numbers must survive, or every capsule
     * becomes unreadable.
     */
    const text = "order 1234567890123456 at 1754400000000";

    expect(redactText(text)).toBe(text);
  });
});

describe("entropy scanning", () => {
  it("scores random strings above prose", () => {
    expect(entropy("aaaaaaaaaaaaaaaa")).toBeLessThan(1);
    expect(entropy("kQ8mZr2xVt7bNw3pLc5y")).toBeGreaterThan(3.5);
  });

  it("flags long high-entropy mixed tokens", () => {
    expect(looksLikeSecret("kQ8mZr2xVt7bNw3pLc5yHd9fJg4s")).toBe(
      true
    );
  });

  it("does not flag long readable identifiers", () => {
    expect(
      looksLikeSecret("getUserProfilePreferencesFromCache")
    ).toBe(false);
  });

  it("does not flag short tokens", () => {
    expect(looksLikeSecret("abc123")).toBe(false);
  });

  it("redacts a bare high-entropy token in a log line", () => {
    const output = redactText(
      "session started kQ8mZr2xVt7bNw3pLc5yHd9fJg4s ok"
    );

    expect(output).toContain("[REDACTED_HIGH_ENTROPY]");
    expect(output).toContain("session started");
  });
});

describe("redactHeaders", () => {
  it("drops credential headers by name", () => {
    const output = redactHeaders({
      authorization: "Bearer abc",
      cookie: "sid=1",
      "x-api-key": "abc",
      "content-type": "application/json"
    });

    expect(output.authorization).toBe("[REDACTED]");
    expect(output.cookie).toBe("[REDACTED]");
    expect(output["x-api-key"]).toBe("[REDACTED]");
    expect(output["content-type"]).toBe("application/json");
  });
});

describe("sanitizeValue", () => {
  it("redacts by key name at any depth", () => {
    const output = sanitizeValue({
      user: { name: "Ada", password: "hunter2" }
    });

    expect(output.user.name).toBe("Ada");
    expect(output.user.password).toBe("[REDACTED]");
  });

  it("stops recursing at the depth limit", () => {
    let deep = { value: "leaf" };

    for (let i = 0; i < 12; i++) {
      deep = { nested: deep };
    }

    expect(JSON.stringify(sanitizeValue(deep))).toContain(
      "[MAX_DEPTH]"
    );
  });

  it("caps arrays so one huge log cannot fill a capsule", () => {
    const output = sanitizeValue(
      Array.from({ length: 500 }, (_, i) => i)
    );

    expect(output).toHaveLength(200);
  });

  it("passes primitives through untouched", () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(null)).toBe(null);
  });
});

describe("truncation", () => {
  it("reports when a value was cut to the size limit", () => {
    const report = redactTextWithReport("x".repeat(600_000));

    expect(report.truncated).toBe(true);
    expect(report.text.length).toBe(500_000);
  });
});

describe("BODY_MIME", () => {
  it.each([
    "application/json",
    "text/html",
    "application/graphql",
    "application/x-www-form-urlencoded"
  ])("captures %s bodies", (mime) => {
    expect(BODY_MIME.test(mime)).toBe(true);
  });

  it.each(["image/png", "font/woff2", "video/mp4"])(
    "skips %s bodies",
    (mime) => {
      expect(BODY_MIME.test(mime)).toBe(false);
    }
  );
});

describe("scanForReview", () => {
  const file = (path, data) => ({
    path,
    encoding: "utf8",
    data
  });

  it("counts what redaction removed", () => {
    const review = scanForReview([
      file(
        "runtime/frame-01-runtime.json",
        '{"h":"[REDACTED]","b":"[REDACTED_JWT]"}'
      )
    ]);

    const kinds = review.removed.map((item) => item.kind);

    expect(kinds).toContain("credential-shaped key");
    expect(kinds).toContain("JWT");
  });

  it("reports nothing residual for already-clean text", () => {
    const review = scanForReview([
      file("manifest.json", '{"captureId":"abc"}')
    ]);

    expect(review.residual).toEqual([]);
  });

  it("catches a leak that the ingest pass missed", () => {
    /*
     * The gate that matters: a raw secret written straight into a file must be
     * visible to the review screen.
     */
    const review = scanForReview([
      file(
        "page/frame-01-selection.json",
        `{"text":"${VENDOR_KEYS.stripe}"}`
      )
    ]);

    expect(review.residual.length).toBeGreaterThan(0);
    expect(review.residual[0].files).toContain(
      "page/frame-01-selection.json"
    );
  });

  it("ignores binary files", () => {
    const review = scanForReview([
      { path: "visual/board.png", encoding: "base64", data: "AAAA" }
    ]);

    expect(review.textFiles).toBe(0);
    expect(review.scannedBytes).toBe(0);
  });
});
