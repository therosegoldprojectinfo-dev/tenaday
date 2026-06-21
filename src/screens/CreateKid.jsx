import { useState } from 'react'
import { createKid, AuthError } from '../lib/parentAuth'
import { OPERATIONS } from '../lib/progression'
import { themeFor } from '../lib/eraTheme'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function CreateKid({ parentId, onCreated, onBack }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  // null = no claim made ("starting fresh" / not sure yet) — every chapter
  // uses the normal 80% pass threshold. Picking a chapter here raises the
  // bar to 90% for that chapter and everything before it (see
  // lib/economy.js's passThresholdFor) — it does NOT change where the kid
  // starts playing; every kid always begins at Addition table 1.
  const [placementClaim, setPlacementClaim] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = name.trim().length > 0 && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const ageNum = age ? parseInt(age, 10) : null
      const kidId = await createKid(parentId, { name, age: ageNum, placementClaim })
      onCreated(kidId)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
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
          <h1 className="font-display font-bold text-3xl text-gray-900 text-center mb-1">
            Add a kid
          </h1>
          <p className="font-body text-sm text-gray-400 text-center mb-7">
            A few details to set up their profile.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                autoComplete="off"
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

            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                Already good at something? <span className="normal-case text-gray-300">(optional)</span>
              </label>
              <p className="font-body text-xs text-gray-400 mb-3 leading-snug">
                Every kid starts from the very beginning either way — this just
                raises the bar a bit on that material, so we can check the claim
                holds up.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {OPERATIONS.map(op => {
                  const theme = themeFor(op)
                  const isSelected = placementClaim === op
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setPlacementClaim(isSelected ? null : op)}
                      className="flex items-center gap-2 rounded-2xl border-2 px-3 py-3 transition-colors"
                      style={{
                        borderColor: isSelected ? theme.colors.primary : '#E5E7EB',
                        backgroundColor: isSelected ? `${theme.colors.primary}14` : 'transparent',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: isSelected ? theme.colors.primary : '#E5E7EB' }}
                      >
                        {isSelected && <CheckIcon />}
                      </div>
                      <span className="font-body font-bold text-sm text-gray-700">{theme.operationLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="font-body text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-2"
            >
              {submitting ? 'CREATING…' : 'CREATE PROFILE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
