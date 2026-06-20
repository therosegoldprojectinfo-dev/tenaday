# Ten a Day — App Specification

## 1. What this is

A mobile web app that gets kids to practice basic math (+, −, ×, ÷) for about
10 minutes a day, in a way that feels like a game, not homework. A parent
creates the account, adds their kid(s), and the kid does the actual playing.

**Platform: mobile web app only, for now.** No desktop layout, no native
iOS/Android app, no tablet-specific layout. Design and build for a single
phone-sized viewport. People access it by opening a link in their phone's
browser — nothing to install, nothing to approve through an app store.

---

## 2. Who uses it

- **Parent**: creates the account, adds kid profiles, views progress, sets
  up real-world gifts/rewards and their coin price.
- **Kid**: picks their profile, plays. Never sees login screens, emails,
  or anything administrative — just their name, their map, and the play
  button.

---

## 3. Accounts & login

- Parent signs up / logs in with **phone number + 4-digit PIN**. No email
  required.
- First time a phone number is used, it creates the account. Returning
  with the same phone + correct PIN logs back in.
- One parent account can have multiple kid profiles under it.
- Adding a kid only requires: first name + starting difficulty level
  (see Section 5). No birthdate, no email, no photo required.

---

## 4. Math scope

Only the four basic operations: **addition, subtraction, multiplication,
division.** Nothing beyond this — no fractions, decimals, exponents, etc.

Two hard rules for question generation:
- **Subtraction never produces a negative result.** If a problem would go
  negative, the two numbers are swapped instead.
- **Division never has a remainder.** Numbers are chosen so the result is
  always a whole number.

---

## 5. Progression ladder

Progression is one long, strictly linear staircase. No skipping, no
choosing your own order, no interleaving operations.

```
Operation  (Addition → Subtraction → Multiplication → Division)
  └─ Table  (1 through 12)
       └─ Stage:
            1. Plain equation        e.g. "7 + 4"
            2. Situation problem     e.g. "Tom has 7 apples and buys 4 more..."
            3. Speed round           same difficulty as the table, but a
                                      visible 5-second countdown PER QUESTION
```

A kid must fully complete Addition (all 12 tables, all 3 stages each)
before Subtraction unlocks, then Multiplication, then Division.

**"Table" applies to all four operations**, not just multiplication — e.g.
"Subtraction, table of 3" means problems built around the number 3.

---

## 6. One attempt, step by step

Each attempt at a stage is a batch of **10 questions**.

- The kid starts with **4 lives**.
- Each wrong answer costs 1 life.
- **Losing all 4 lives before finishing the 10 questions = the attempt
  ends immediately ("died").** To try again, they must pay the entry fee
  again (see Economy below).
- If they survive all 10 questions (3 or fewer mistakes total):
  - **8, 9, or 10 correct → PASS.** Advances to the next stage/table/
    operation. Earns coins.
  - **7 or fewer correct → did not pass, but did not die either.** No
    coins lost beyond what was already spent on entry. Can immediately
    retry the same stage with a new random batch of 10, no extra cost.

---

## 7. Economy: coins

- A new kid profile starts with a set amount of coins (exact starting
  amount: tune during build, example used in planning was small,
  e.g. 50).
- Starting an attempt costs a fixed **entry fee** in coins (example used
  in planning: 10 coins — final number to be tuned during build/testing).
- **Passing a stage earns more coins than the entry fee cost** — the loop
  is meant to be sustainable on a normal day; coins are mainly meant to
  fund gifts, not to be a constant struggle.
- **Dying** (losing all 4 lives) means the next attempt requires paying
  the entry fee again.
- If a kid doesn't have enough coins to pay the entry fee, their balance
  can go **negative (debt)** rather than locking them out of playing.
  - **Debt is capped at −2× the entry fee** (e.g. if entry fee is 10
    coins, debt can never go below −20). Past that floor, retries are
    effectively free until the balance climbs back above the cap.
  - While in debt, any coins earned go toward paying off the debt
    first. Rewards stay locked until the balance is back to 0 or above.
- A kid is never fully blocked from playing because of coins — debt
  exists specifically so the daily habit/streak is never broken by a bad
  day.

---

## 8. Gifts (real-world rewards)

- The parent defines a list of real-world rewards from their dashboard
  (example used in planning: "20 minutes of TV").
- The parent sets the **coin price** for each reward.
- The kid spends saved-up coins to "buy" a reward once they can afford
  it. Buying a reward is something the kid does in-app; honoring it
  (actually giving the 20 minutes of TV) happens in real life, outside
  the app.

---

## 9. Visual world: the journey map

Progression is shown as a **walkable path/map**, not a level counter or
percentage. The map is divided into **4 eras, one per operation**, in
this exact order:

| Operation      | Era             | Visual motifs                          |
|----------------|-----------------|------------------------------------------|
| Addition       | Stone Age       | campfires, caves, mammoths              |
| Subtraction    | Medieval        | castles, knights, dragons               |
| Multiplication | Industrial Age  | trains, factories, gears, smokestacks   |
| Division       | Futuristic City | spaceports, robots, neon                |

Within an era, the 12 tables act as stepping stones along the path.
Consider a landmark every few tables (a cave, then a hunt, then a
volcano, for Stone Age, etc.) so a 12-table walk has visual variety
instead of being 12 identical dots.

The map doubles as an implicit difficulty/progress signal for parents —
"still in the Stone Age" vs. "already in the Futuristic City" communicates
progress without needing any numbers.

---

## 10. Parent dashboard

Per kid, shows at minimum:
- Name
- Current position on the journey map (era + table + stage)
- Coin balance (including if currently in debt)

Also where the parent manages the **gifts list** (Section 8) — adding,
editing, removing rewards and their coin prices.

---

## 11. Feedback & feel

- Correct answer: quick positive animation/sound, no friction.
- Wrong answer: gentle, never punishing in tone — show the right answer
  briefly, move on. The lives/coins system already carries the stakes;
  the per-question feedback itself should stay encouraging.
- Passing a stage: a small celebration moment (stars, sound, coin
  counter ticking up).
- Dying: clear but calm — explain what happened (ran out of lives) and
  what it costs to go again, no guilt-tripping language.

---

## 12. Explicitly out of scope for now

- Any math beyond +, −, ×, ÷
- Native iOS/Android apps
- Desktop/tablet-optimized layouts
- Multiple parents per kid / shared family accounts
- Social features, leaderboards, friending
- Anything beyond the 4 eras already defined

---

## 13. Known placeholder numbers to finalize during build

These were used as examples while designing the concept, not final
balanced values — tune them based on actual play:
- Starting coin balance for a new kid
- Entry fee per attempt
- Exact coins earned per pass (must stay above entry fee)
- Debt cap multiplier (currently 2× entry fee)
- Pass threshold (currently fixed at 8/10 — could become tunable per
  stage later, not needed for v1)
