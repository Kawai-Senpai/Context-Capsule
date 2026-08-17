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

Colour carries meaning here. These five never swap roles.

| Token | Hex | Means |
| --- | --- | --- |
| `--yellow` | `#ffe047` | The thing to press next |
| `--ink` | `#0a0a0a` | Structure, primary action |
| `--blue` | `#2f6bff` | A tool you are holding |
| `--red` | `#ff4d3d` | Your annotation, and destructive actions |
| `--green` | `#1faa5f` | A confirmed fact |

Field and type:

| Token | Hex |
| --- | --- |
| `--paper` | `#ffffff` |
| `--paper-2` | `#f4f2ed` |
| `--ink-soft` | `#3d3d3d` |
| `--ink-mute` | `#7a7873` |
| `--line-soft` | `#d8d5cc` |

Editorial brutalism: paper field, heavy black display type, one loud yellow. The
panel sits beside the app you are debugging, so it does not try to blend in — it
reads like a printed worksheet with four numbered steps.

Dark mode inverts the field but keeps the yellow, the red and the black tape
band, because the yellow is the "press this next" signal and must stay the
loudest thing on screen either way.

Form is hard-edged: `--r-sm/md/lg` are all `0px`, and roundness is reserved for
pills and the mark. Shadows are offset planes (`3px 3px 0`), never blur.

Canonical values live in [`extension/tokens.css`](../extension/tokens.css) — that
file is the source of truth, this table is the explanation. If the two disagree,
the stylesheet wins.

## Mark

A disc with a wedge taken out of it and a reticle at its centre: a container
with its contents extracted, open toward the thing it took them from, and the
human pointing at the exact spot.

Two flat colours, hard edges, no gradient — the mark has to survive being 16
pixels wide in a browser toolbar, so nothing in it is subtle.

- Geometry: [`mark.svg`](mark.svg) · lockup: [`logo.svg`](logo.svg) · social:
  [`banner.svg`](banner.svg)
- Icons are generated from the same geometry by
  [`tools/build-icons.mjs`](../tools/build-icons.mjs) — run `npm run icons`.
  Never hand-edit files in `extension/icons/`.
- Clear space: one capsule-corner-radius on all sides.
- The field is `--yellow` and the capsule is `--ink`. Never inverted, never
  gradient, never a third colour.
- The wedge is the arc from 192° round to 118°.
  [`tools/build-icons.mjs`](../tools/build-icons.mjs) reproduces that geometry
  analytically — change one and change the other.

## Type

- Display and interface: `Archivo` at weight 800–900 for headings, falling back
  to `Helvetica Neue, Inter, ui-sans-serif, system-ui`.
- Evidence, counts, IDs, paths, status: `ui-monospace`. If a number can be
  compared to another number, it is monospace.

## Tagline

> **point at the bug · ship the evidence**

Lowercase, monospace, middot separator. The longer positioning line, for stores
and READMEs:

> Select any part of a live web application and package everything a coding
> agent needs to understand it.

Never pitch it as a screenshot tool. The screenshot is the cover page.
