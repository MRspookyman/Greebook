# Greenbook · Diario editorial

Foundation ready for screen composition. Preserve behavior, focus styles, 44px touch targets and text ≥12px.

## Type
- Screen heading: `display` (Fraunces Variable 400, 34px/1.06). Optional second line `display-italic` (350). h1 already matches display; h2 matches `title`.
- Section/book heading: `title` (450, 23px/1.16).
- Functional prose/controls: Inter, normally 14–16px; metadata `text-xs` minimum.
- Functional labels: `eyebrow` (12px uppercase, .08em). Do not put an eyebrow above a heading; reserve it for real labels/metadata.
- Reading folios and figures: `folio` (20px), `num` (size inherited), `stat-number` (size inherited); Fraunces oldstyle/tabular figures.
- Couple's actual huella/message words only: `hand` (Caveat 500, 22px/1.15, ink). Never handwriting for names in UI labels, navigation, numbers or actions.
- Fraunces uses full roman/italic variable files, optical sizing auto, SOFT 20/WONK 1. Do not hardcode the old `Fraunces` family; use `font-serif`.

## Page rhythm
Page margin 26px (`px-[26px]`), sections 20–24px apart. Spacing scale 4/8/12/16/20/24/32px. Group tightly (6–12px), leave more air before headings than after. Continuous paper is the default.
- `section`: unboxed vertical spacing; adjacent sections get a hairline. Use a semantic section with this class where helpful.
- `rule`: top hairline in `--rule`. `border-rule` is also available.
- `card`: rare paper inset, borderless, 8px radius, warm offset shadow. Suitable for a preserved intimate note or a focused sheet inset, not every reading/metric. No nested cards.

## Actions
- `btn btn-primary`: solid accent; at most one dominant solid action per screen. Dark mode uses dark ink on the lighter accent automatically.
- `btn btn-outline`: transparent ink outline for supporting actions such as Leer.
- `btn btn-link`: secondary action with underline and 44px hit area.
- `btn btn-soft`: very quiet wash, use sparingly. Existing secondary/ghost APIs still work.
- `icon-btn`: outlined 44px, 6px corners. `chip`: thin outline and 6px corners, minimum 44px. Inputs 6px corners.
- Pressure response .98/140ms; no bounce or ambient looping decoration.

## Components
- `Cover`: physical spine/page edge, warm offset shadow, 2px corners. `ribbon="blue" | "green"` optional only for current reading. Suggested widths: hero/current 80–90px, secondary list 48–60px, library 88–104px, detail 90–110px. Calendar thumbnails may be 20px but retain accessible book names outside them. Generated cover type never below 12px.
- `ProgressBar`: default 3px; do not add chunky height utilities.
- `DualProgressBar`: hairline with 12px flags. Keep room for both names.
- `Segmented`: `variant="underline"` for editorial text tabs; default `pill` retained for compact form choices. Sliding indicator is 140ms.
- `Avatar`: outlined by default; optional `filled` for selection. TabBar has thin icons and outlined central +. Sheets use paper and a ruled header.

## Palette
Light bg #F7F3EA / surface #FFFDF8 / ink #2B2A26 / muted & placeholder #6D685E / rule #DCD5C8.
Dark bg #1D231E / surface #252C25 / ink #EEE8DA / muted & placeholder #B0AA9E / rule #41483E.
Blue/green identity remains per user; amber text always `text-amber-ink`, not `text-amber`. Use `text-muted` and placeholder token; do not lower opacity of metadata. Very subtle background grain does not sit on top of text and is disabled for print/reduced transparency.

Light accents are slightly ink-deepened for textured-paper contrast: blue #486DA1, green #4A7555. Dark accents: blue #9BB4D1, green #96B58E. Amber-ink: light #875D18 / dark #E6B96D.

Measured WCAG contrast (background / surface): light muted+placeholder 5.00 / 5.45, amber-ink 5.25 / 5.72, blue 4.77 / 5.19, green 4.78 / 5.21. Dark muted+placeholder 6.93 / 6.20, amber-ink 8.79 / 7.86, blue 7.51 / 6.72, green 7.09 / 6.34. Conservative darkest grain light-paper sample #F1EDE4: muted 4.74, amber-ink 4.98, blue 4.52, green 4.53.

## Avoid
No nested boxes, dashboard tile grids, decorative kicker above heading, huge progress rings, text under 12px, meaningless emoji controls, handwriting outside huellas, oversized rounded cards, or multiple solid calls-to-action. Keep original accessible labels, focus-visible, reduced motion and all interactions.
