<div align="center">
  <img src="logo.svg" alt="Context Capsule" width="380">
</div>

# Brand

## Name

**Context Capsule.** A capsule is a sealed container with a known content list —
which is exactly what the product produces. Never "Capsule Context", never
"ContextCapsule". Short form in cramped UI: **Capsule**.

## Voice

The product is a **forensic instrument**, not an assistant. It does not chirp,
it does not congratulate, and it never claims to know something it inferred.

| Do | Don't |
| --- | --- |
| "Runtime evidence starts when capture was armed." | "Oops! Nothing to show yet 🙈" |
| "3 selections · 37 events · 18 requests" | "Lots of context captured!" |
| "Redaction may have missed sensitive data." | "Your data is safe and secure." |
| "Close DevTools on this tab and try again." | "Something went wrong." |

Three rules:

1. **State the limit.** Every capsule says what it does *not* contain.
2. **Never label a guess as a fact.** Provenance is `exact`, `strong` or
   `possible`, and the word for a guess is never "exact".
3. **Count things.** Numbers beat adjectives in an evidence tool.

## Colour

Colour carries meaning here. These four never swap roles.

| Token | Hex | Means |
| --- | --- | --- |
| `--violet` | `#7C6BFF` | The tool itself: selection, primary action, chrome |
| `--teal` | `#2AD9C4` | A confirmed fact: armed, captured, verified, 200 OK |
| `--amber` | `#FFB454` | A region *you* drew, and anything needing review |
| `--coral` | `#FF5C7A` | Your annotation, and destructive actions |

Field and type:

| Token | Hex |
| --- | --- |
| `--ink-900` | `#0B0A12` |
| `--ink-700` | `#171331` |
| `--paper` | `#F7F7FB` |
| `--paper-dim` | `#B8B6CD` |
| `--paper-mute` | `#8B8AA6` |

The surface is always dark. The panel sits beside the application under
inspection and must never compete with it for attention.

Canonical values live in [`extension/tokens.css`](../extension/tokens.css) — that
file is the source of truth, this table is the explanation.

## Mark

A capsule tilted −45°, split by a seam, with a teal reticle at its centre: the
human pointing at the exact thing, sealed into a container.

- Geometry: [`mark.svg`](mark.svg) · lockup: [`logo.svg`](logo.svg) · social:
  [`banner.svg`](banner.svg)
- Icons are generated from the same geometry by
  [`tools/build-icons.mjs`](../tools/build-icons.mjs) — run `npm run icons`.
  Never hand-edit files in `extension/icons/`.
- Clear space: one capsule-corner-radius on all sides.
- The reticle is never any colour but teal. The field is never any colour but
  the violet gradient.

## Type

- Interface: `ui-sans-serif, system-ui` — no webfont, because the panel must
  paint instantly and offline.
- Evidence, counts, IDs, paths, status: `ui-monospace`. If a number can be
  compared to another number, it is monospace.

## Tagline

> **point at the bug · ship the evidence**

Lowercase, monospace, middot separator. The longer positioning line, for stores
and READMEs:

> Select any part of a live web application and package everything a coding
> agent needs to understand it.

Never pitch it as a screenshot tool. The screenshot is the cover page.
