// This is intentionally just a placeholder confirming the base boots.
// The real screens (Login, Map, Practice, Gifts, Profile, Parent
// Dashboard) and the bottom tab nav (Map / Gifts / Profile) should be
// built from ten-a-day-spec.md - that's the next step, not part of
// this base scaffold.
//
// Suggested home for each piece as it gets built:
//   src/screens/   -> one file per full screen
//   src/components/ -> shared pieces reused across screens (buttons,
//                       cards, the lives counter, the coin counter)
//   src/lib/        -> non-UI logic (problem generator, progression
//                       rules, streak/coin math)

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl text-stoneage-primary mb-2">Ten a Day</h1>
        <p className="text-ink/50">Base is wired up. Screens go here next.</p>
      </div>
    </div>
  )
}
