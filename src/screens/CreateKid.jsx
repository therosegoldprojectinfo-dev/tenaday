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
function StepLevel({ name, onNext, onBack }) {
  const [selected, setSelected] = useState(null) // index into LEVEL_OPTIONS

  function handleChoose(index) {
    setSelected(index)
  }

  function handleContinue() {
    if (selected === null) return
    onNext(LEVEL_OPTIONS[selected].claim)
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
          <h1 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">
            What's your level, {name}?
          </h1>
          <p className="font-body text-sm text-gray-400 text-center mb-6">
            Be honest — we'll check! Either way, you always start from the beginning.
          </p>

          <div className="flex flex-col gap-3">
            {LEVEL_OPTIONS.map((opt, i) => {
              const isSelected = selected === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChoose(i)}
                  className="w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors active:scale-[0.98]"
                  style={{
                    borderColor: isSelected ? '#58cc02' : '#E5E7EB',
                    backgroundColor: isSelected ? '#EAF8DC' : 'transparent',
                  }}
                >
                  <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
                  <div className="min-w-0">
                    <p className={`font-body font-bold text-sm leading-tight ${isSelected ? 'text-green-800' : 'text-gray-900'}`}>
                      {opt.title}
                    </p>
                    <p className="font-body text-xs text-gray-400 mt-0.5 leading-snug">{opt.subtitle}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0 ml-auto flex items-center justify-center"
                    style={{
                      borderColor: isSelected ? '#58cc02' : '#D1D5DB',
                      backgroundColor: isSelected ? '#58cc02' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={selected === null}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-6"
          >
            CREATE PROFILE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Test warning (only shown when kid claimed a level) ────────────
const CLAIM_LABELS = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}

function StepTestWarning({ name, claim, onConfirm, onBack }) {
  const questionCount = { addition: 20, subtraction: 20, multiplication: 20, division: 20 }[claim] || 20
  const claimEmoji = { addition: '➕', subtraction: '➖', multiplication: '✖️', division: '➗' }[claim] || '🧮'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-5">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors active:bg-gray-100"
          aria-label="Back">
          <BackIcon />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">

          <div className="flex flex-col items-center gap-2">
            <span className="text-8xl select-none" style={{ animation: 'correct-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              🕵️
            </span>
            <span className="text-4xl">{claimEmoji}</span>
          </div>

          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">
              Prove it, {name}! 😤
            </h1>
            <p className="font-body text-lg text-gray-500 leading-relaxed">
              You said you're already good at{' '}
              <span className="font-bold text-gray-800">{CLAIM_LABELS[claim]}</span>.
              {' '}Let's find out if that's true! 👀
            </p>
          </div>

          <div className="w-full rounded-3xl px-5 py-5 flex flex-col gap-3"
            style={{ background: 'linear-gradient(135deg, #EAF8DC 0%, #DDF0FB 100%)' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📝</span>
              <p className="font-body font-bold text-base text-gray-800 text-left">
                {questionCount} questions — mix of everything!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <p className="font-body font-bold text-base text-gray-800 text-left">
                Get 16+ right and you skip ahead!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">😊</span>
              <p className="font-body font-bold text-base text-gray-800 text-left">
                Don't worry if you don't pass — no big deal!
              </p>
            </div>
          </div>

          <button onClick={onConfirm}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
            I'M READY! 💪
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main CreateKid orchestrator ───────────────────────────────────────────
export default function CreateKid({ parentId, onCreated, onBack }) {
  const [nameAge, setNameAge]       = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  async function handleStep1Done({ name, age }) {
    setNameAge({ name, age })
    setSubmitting(true)
    setError(null)
    try {
      const kidId = await createKid(parentId, {
        name,
        age,
        placementClaim: null,
        timezone: detectTimezone(),
      })
      onCreated(kidId, null)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Creating profile…</p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="font-body text-sm text-red-600">{error}</p>
        </div>
      )}
      <StepNameAge onNext={handleStep1Done} onBack={onBack} />
    </div>
  )
}
