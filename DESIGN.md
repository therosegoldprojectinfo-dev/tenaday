<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: Ten a Day
description: A mobile math game where kids advance through four fully-drenched worlds by practicing arithmetic — arcade energy for kids, clean tool for parents.
---

# Design System: Ten a Day

## 1. Overview

**Creative North Star: "Worlds Worth Reaching"**

Ten a Day runs on one premise the design must always serve: the world you're playing in is the reward, and math is the key that unlocks the next one. Each of the four eras — Stone Age, Medieval, Industrial, Futuristic City — is a fully realized visual environment, not a color swap. Backgrounds aren't neutral containers; they are the era. The design borrows from Nintendo's commitment: every screen is instantly readable as "Stone Age" or "Futuristic" without a label.

The visual reference is Duolingo's arcade clarity — bold shapes, instant reactions, unmistakable celebration moments, obvious progress. Not Duolingo's guilt-loop mechanics, but its visual language: bright, legible, joyful. This app should feel like something a 5-year-old picks up without instruction, and a 7-year-old won't find babyish. The feedback loop is the whole experience: correct answer → reaction → coin → world advances. Every design choice should tighten that loop.

The parent dashboard inhabits a completely different register: clean, fast, informational. It shares the token system but not the immersion. The two surfaces must feel coherent — same family, different rooms.

**Key Characteristics:**
- Four drenched worlds, each with its own color temperature and distinct atmosphere
- Arcade-grade reactions on every correct answer, pass, and coin earn — silence is a bug
- Big tap targets, icons-first, near-zero reading required for core gameplay (age 5)
- Parent dashboard: neutral, Inter-only, no era immersion
- Nothing that looks like classroom software, an edtech tool, or school-approved software

## 2. Colors

Four era palettes, each fully committed to its world. The shared chrome (ink, parent bg) is the only cross-era stable color. Everything else is era-owned.

**The Drenched Era Rule.** Each era background is a committed saturated color below 0.50 OKLCH lightness (Futuristic below 0.25). If Stone Age looks like cream with a warm tint, it's wrong. If Futuristic looks like off-white with a blue hint, it's wrong. The surface IS the world.

**The Chrome Separation Rule.** Ink and neutral-bg appear only on the parent dashboard and in UI chrome overlaid on era content (coin counter, lives bar). They do not bleed into era backgrounds or node colors.

### Primary (Era Palettes — values to be resolved during implementation)

**Stone Age (Addition)**
Atmosphere: firelight, cave earth, mammoth bone, amber embers. This era is warm — the whole screen should feel like an underground campfire.
- Background: Deep warm clay — oklch(0.42 0.09 55). Committed earth, not a tinted pale.
- Primary (nodes, pucks, landmarks): Warm umber-brown — oklch(0.55 0.07 55).
- Accent (feedback, coins, highlights): Ember orange — oklch(0.72 0.17 45).

**Medieval (Subtraction)**
Atmosphere: castle stone, moonlit night, heraldic gold, dragon shadow. Cold and purple, gold is the only warmth.
- Background: Deep stone-indigo — oklch(0.22 0.07 280).
- Primary: Deep violet — oklch(0.40 0.13 285).
- Accent: Heraldic gold — oklch(0.82 0.15 75). The only warm note in a cold world.

**Industrial Age (Multiplication)**
Atmosphere: factory floor, forge fire, iron girder, copper steam-pipe. Cold steel with hot fire. Orange is the only warm thing.
- Background: Dark iron-slate — oklch(0.25 0.04 240).
- Primary: Steel blue-grey — oklch(0.45 0.05 235).
- Accent: Forge orange — oklch(0.70 0.19 40).

**Futuristic City (Division)**
Atmosphere: space harbor, neon night, cyan haze, robot chrome. The darkest era; the accent is the only visible light.
- Background: Near-black with deep blue — oklch(0.15 0.05 230).
- Primary: Dark teal — oklch(0.35 0.13 195).
- Accent: Electric cyan — oklch(0.85 0.19 195).

### Neutral (Shared Chrome)

- **Ink** (current #2B2118, approx oklch(0.18 0.02 70)): All text on the parent dashboard and UI chrome labels. Warm dark near-black; retain this character.
- **Parent Background** [to be resolved]: The parent dashboard surface. Must be a true neutral — no cream tint. Target oklch(0.98 0.005 250) or pure white. The existing `cream` token (#FBF3E7) is too warm for a tool surface; replace it on the parent dashboard. Cream may remain as a very light overlay inside era content where readable contrast demands it.

### Named Rules

**The No-Classroom Rule.** If the palette looks like it could appear on a school whiteboard, an edtech app, or a district IT-approved tablet, it's wrong. No soft primary colors on white. No pastel era tints labeled as "Stone Age tan."

**The One Accent Rule.** Per era screen, the accent color is used only for: correct-answer feedback, coin/pass celebrations, and primary interactive elements. It is not decorative fill. Rarity is the point — when orange fires, it means something.

## 3. Typography

**Display Font:** Baloo 2 (Google Fonts; weights 500, 600, 700, 800)
**Body / UI Font:** Inter (Google Fonts; weights 400, 500, 600, 700)

**Character:** Baloo 2 is rounded, warm, and legible at extreme weights — purpose-built for playful reading at size. Inter is neutral and precise at small sizes — purpose-built for data labels and UI chrome. The contrast between them is intentional: soft play vs. sharp information. They should never compete for the same role on the same screen.

**The Display-Only Rule.** Baloo 2 appears in: question text, era/stage headings, celebration copy, prominent coin/lives numbers. It does not appear in: button labels, form fields, parent dashboard body text, instructional prose, tab navigation, or any UI chrome text. Those belong to Inter. Baloo 2 in small sizes loses its personality; don't shrink it below 1.125rem.

### Hierarchy

- **Display** (Baloo 2 800, 2.5–3rem, line-height 1.15): Question text in practice mode. The number the kid reads — must be instantly legible at arm's length on a phone.
- **Headline** (Baloo 2 700, 1.75rem, line-height 1.2): Era name on map, stage headings, celebration text.
- **Title** (Baloo 2 600, 1.25rem, line-height 1.3): Node labels, mini-section headers on the map.
- **Body** (Inter 400, 1rem / 16px, line-height 1.5, max 65ch): Situation problem text (Stage 2), instructions, parent dashboard text.
- **Label** (Inter 600, 0.75rem / 12px, letter-spacing 0.04em): Coin count, lives remaining, table indicator, parent dashboard stats.

### Named Rules

**The Zero-Reading Rule.** A 5-year-old should complete a full play session without reading a single label. Icons and counters carry the gameplay; text is context for older kids, not a requirement for core play.

## 4. Elevation

Era screens are flat by default — the era background is the floor, and nodes emerge from it with a compound hard-edge game shadow. This is already established in Map.jsx and defines the visual language: pucks feel physical, backgrounds feel boundless.

The parent dashboard uses tonal layering only (no drop shadows on list items or kid-profile cards). Depth is expressed through background lightness steps, not shadow blur.

**The Puck Shadow Rule.** Journey nodes and interactive answer buttons use the compound game-button shadow: hard bottom under-stroke + diffuse drop + inner highlights. This tactile pattern is the design's signature physical affordance. Do not flatten it to a single shadow or remove it. New landmark or interactive elements inherit this pattern.

### Shadow Vocabulary

- **Puck / interactive game button:** `0 5px 0 0 [era-shadow-dark], 0 9px 18px rgba(0,0,0,0.30), inset 0 3px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.18)` — The signature physical game shadow. Each era's shadow tint should draw from its own primary (e.g., Stone Age uses a darker umber, Futuristic uses a darker indigo).
- **Parent dashboard surfaces:** No shadow. Tonal background difference only.
- **Feedback pop (correct answer, pass celebration):** Brief scale + glow during animation; does not persist as a static shadow state.

## 5. Components

*Omitted in seed mode. Re-run `/impeccable document` once the journey nodes, practice screen, lives bar, coin counter, and parent dashboard are built — that pass will extract the real component patterns and generate the design panel sidecar.*

## 6. Do's and Don'ts

### Do:
- **Do** make era backgrounds deeply committed — oklch lightness below 0.50 for Stone Age, Medieval, Industrial; below 0.25 for Futuristic. Below those floors, each era reads as a world.
- **Do** give each era a single dominant color temperature: Stone Age is warm (orange-brown), Medieval is cold-purple with gold pops, Industrial is cold-steel with hot fire accents, Futuristic is cold-dark with electric cyan as the only light.
- **Do** use the compound puck shadow on all interactive game nodes and answer buttons. The tactile under-stroke is the affordance — it tells a 5-year-old "press this."
- **Do** use Baloo 2 at weight 800 for question text. It is the most critical readable element; maximum weight is correct.
- **Do** size all interactive targets to ≥ 48px. Kids aged 5–8 miss anything smaller; the UI should be forgiving and confident.
- **Do** build a real reaction into every correct answer, stage pass, and coin earn. Motion is not decoration here — it is the product. Silence on a pass is a bug.
- **Do** treat the parent dashboard as a separate surface: Inter-only, neutral background, no era color bleeding in. It should not look like the game.
- **Do** vary the compound puck shadow tint per era — the shadow color should draw from the era's primary, making even the shadow feel world-specific.

### Don't:
- **Don't** use the current `cream` token (#FBF3E7) as an era background. It is a warm placeholder and it reads as edtech-default. Replace it with the era's committed background color.
- **Don't** design era screens to look like school software, a classroom whiteboard tool, or a district IT-approved app. No primary-colors-on-white, no clip-art mascot style, no "learning" visual grammar.
- **Don't** use streak mechanics, passive-aggressive notifications, or guilt-framing around the coin economy. The debt system exists so kids can always play; the UI should say "try again," not "you owe coins."
- **Don't** put Baloo 2 in UI chrome labels, button text, or parent dashboard copy. That's Inter territory. Baloo 2 at 0.75rem loses its warmth and competes with the content type.
- **Don't** animate layout properties (width, height, top, left). Use transform + opacity only. Index.css already suppresses all animation for prefers-reduced-motion; individual animations should degrade to a crossfade, not simply disappear (invisible content is a bug, not a graceful fallback).
- **Don't** use gradient text (`background-clip: text`). It's decorative noise. Era accent as a solid color on the puck or celebration moment is stronger.
- **Don't** use glassmorphism as a default card treatment. If one era earns a glass surface as a landmark element, that's voice. Every container being glass is noise.
- **Don't** build identical card grids for map nodes. Each node is a physical game object — puck, landmark, milestone — not a content card with icon + heading + text.
