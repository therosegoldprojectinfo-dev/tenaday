# Product

## Register

product

## Users

**Kids (ages 5–8) — the primary players.** They never see login screens, emails, or anything administrative. Their world is their profile name, the journey map, the play button, lives, and coins. Reading load must be near-zero for core gameplay; icons and animation carry the message.

**Parents — account managers and reward setters.** They handle signup (phone + PIN), add kid profiles, check progress, and define real-world gifts with coin prices. They need a clean, fast dashboard — not a game, not a toy.

## Product Purpose

A mobile web app that gets kids to practice the four basic math operations (+, −, ×, ÷) for about 10 minutes a day — in a way that feels like a real game, not homework.

Kids progress through a journey map divided into four eras (Stone Age → Medieval → Industrial Age → Futuristic City), each unlocking as they master the previous operation. A coin economy funds real-world gifts set by parents, keeping the habit sustainable even on hard days. No app store, no install — just a link in a phone browser.

Success looks like: a kid opening the app voluntarily. Every design choice should make that likelier.

## Brand Personality

Arcade, alive, earned.

Fast, bright, rewarding — the feedback is loud, the world reacts, and progress feels visceral. The UI disappears into the game. Nothing "educational software" about it.

## Anti-references

- **Not Prodigy Math / school software.** No classroom-whiteboard aesthetic. No district-IT-approval look. Nothing that reads as "this was made for a teacher's lesson plan."
- **Not the edtech pastel.** No soft primary-color illustrations on white backgrounds. No "learning" typography. No clip-art mascots.
- **Not guilt-loop gamification.** No streak anxiety, no passive-aggressive notifications, no dark patterns around the coin economy.

## Design Principles

1. **The map is the reward.** The visual world is the motivator; math is the key that unlocks it. Every era should feel like a destination worth reaching, not a skin on a progress bar.

2. **Momentum, never guilt.** The economy exists so the daily habit is never broken by a bad day. The UI must mirror this: retry is always one tap away, debt is framed as a temporary state, dying is "try again" not "you failed."

3. **Arcade-grade feedback.** A correct answer, a stage pass, a coin earn — all deserve a real reaction. Silent confirmation is a bug. Motion and sound are not decoration here; they are the product.

4. **Age 5 reads icons, not words.** Tap targets ≥ 48px. Icons-first for core gameplay actions. Zero reading required to play. Text is for context (coin count, lives remaining), not navigation.

5. **Two audiences, two registers — one coherent world.** The kid-facing game is expressive, era-immersed, and kinetic. The parent dashboard is clean and informational. They share the same token system and feel cohesive, but the parent surface never bleeds into the child surface, and vice versa.

## Accessibility & Inclusion

Ages 5–8. No stated special requirements. Minimum guarantees:
- All interactive elements ≥ 48px tap target
- Body text ≥ 4.5:1 contrast on its background
- `prefers-reduced-motion` already handled in `src/index.css` — animations must degrade gracefully, never hide content
- Large-text labels (lives, coin count, question display) ≥ 3:1 contrast
