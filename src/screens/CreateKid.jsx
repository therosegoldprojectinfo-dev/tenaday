import { useState } from 'react'
import { createKid, AuthError } from '../lib/parentAuth'
import { detectTimezone } from '../lib/dayGate'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}

// Kid-friendly level options — each maps to an operation_type claim (or null)
// but the language is relatable, not technical.
const LEVEL_OPTIONS = [
  {
    claim: null,
    emoji: '🌱',
    title: "I'm just starting out",
    subtitle: "I want to learn everything from the beginning",
  },
  {
    claim: 'addition',
    emoji: '➕',
    title: "I'm not a little kid anymore",
    subtitle: "I already know my addition",
  },
  {
    claim: 'subtraction',
    emoji: '➖',
    title: "I know addition and subtraction",
    subtitle: "I'm getting pretty good at this",
  },
  {
    claim: 'multiplication',
    emoji: '✖️',
    title: "I know multiplication too",
    subtitle: "Addition, subtraction, multiplication — I've got this",
  },
  {
    claim: 'division',
    emoji: '🧠',
    title: "I master all forms of math",
    subtitle: "Addition, subtraction, multiplication AND division",
  },
]

// ── Step 1: Name + Age ────────────────────────────────────────────────────
function StepNameAge({ onNext, onBack }) {
  const [name, setName] = useState('')
  const [age, setAge]   = useState('')

  const canContinue = name.trim().length > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!canContinue) return
    onNext({ name: name.trim(), age: age ? parseInt(age, 10) : null })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-5">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors active:bg-gray-100"
          aria-label="Back"
        >
          <BackIcon />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <img src="/numiologoapp.png" alt="Numio" className="h-20 w-auto object-contain" draggable={false} />
          </div>
          <h1 className="font-display font-bold text-3xl text-gray-900 text-center mb-1">
            Add a kid
          </h1>
          <p className="font-body text-sm text-gray-400 text-center mb-7">
            Just a couple of details to get started.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                autoComplete="off"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What's their name?"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900
                           focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                Age <span className="normal-case text-gray-300">(optional)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={3}
                max={17}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 7"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900
                           focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!canContinue}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-2"
            >
              CONTINUE →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Step 2: Level picker ──────────────────────────────────────────────────

// ── Step 3: Test warning (only shown when kid claimed a level) ────────────
const CLAIM_LABELS = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}


// ── Main CreateKid orchestrator ───────────────────────────────────────────
export default function CreateKid({ parentId, onCreated, onBack }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  // Create a minimal kid record immediately — name and age will be
  // collected in the new ChildOnboarding flow right after this.
  async function handleCreate() {
    setSubmitting(true)
    setError(null)
    try {
      const kidId = await createKid(parentId, {
        name: 'New Kid',
        age: null,
        placementClaim: null,
        timezone: detectTimezone(),
      })
      onCreated(kidId)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // Auto-create on mount
  if (!submitting && !error) {
    handleCreate()
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Setting up...</p>
      </div>
    )
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Setting up...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="font-body text-gray-500 text-center">{error}</p>
        <button onClick={handleCreate} className="btn-duo px-8 py-3 rounded-2xl font-body font-bold">
          Try again
        </button>
      </div>
    )
  }

  return null
}
