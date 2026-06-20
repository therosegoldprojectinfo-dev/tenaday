# Screens

One file per full screen, built from `ten-a-day-spec.md`.

Expected screens based on the spec:
- `Login.jsx` - parent phone + PIN
- `KidPicker.jsx` - choose/add a kid profile
- `Map.jsx` - the 4-era journey map (Stone Age / Medieval / Industrial / Futuristic)
- `Practice.jsx` - the question loop: lives, the question, multiple choice,
  Duolingo-style confirm + continue feedback panel (see chat reference image)
- `SessionResult.jsx` - pass/fail/death outcome screen
- `Gifts.jsx` - quest-style reward cards with progress bars (see chat
  reference image), parent-defined gifts
- `Profile.jsx` - kid's name, coin balance
- `ParentDashboard.jsx` - separate from the kid's 3-tab nav; manage kids,
  view progress, set gift prices

Bottom tab nav (Map / Gifts / Profile) wraps the kid-facing screens once
they're logged in - see spec Section 9 for nav structure.
