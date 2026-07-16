import { useState, useEffect, useRef } from 'react'
import { createKid, AuthError } from '../lib/parentAuth'
import { detectTimezone } from '../lib/dayGate'
import { trackEvent } from '../lib/analytics'

export default function CreateKid({ parentId, onCreated, onBack }) {
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const calledRef = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-invoke within the SAME attempt
    // — but retryCount changing (via the "Try again" button below) must
    // still re-run this effect, which is why retryCount is a dependency.
    // Previously this effect had `[]` deps, so after a failure the "Try
    // again" button reset calledRef/error but nothing ever re-triggered
    // the effect — the user was stuck on "Setting up..." forever.
    if (calledRef.current) return
    calledRef.current = true

    async function handleCreate() {
      try {
        const kidId = await createKid(parentId, {
          name: 'New Kid',
          age: null,
          placementClaim: null,
          timezone: detectTimezone(),
        })
        trackEvent('child_created', { parentId, kidId })
        onCreated(kidId)
      } catch (err) {
        setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
      }
    }

    handleCreate()
  }, [retryCount])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="font-body text-gray-500 text-center">{error}</p>
        <button
          onClick={() => { calledRef.current = false; setError(null); setRetryCount(c => c + 1) }}
          className="btn-duo px-8 py-3 rounded-2xl font-body font-bold"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="font-body text-gray-400">Setting up...</p>
    </div>
  )
}
