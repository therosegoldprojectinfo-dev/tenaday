import { useState } from 'react'
import { verifyPin } from '../lib/pinAuth'
import { supabase } from '../lib/supabaseClient'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}

function PinDot({ filled }) {
  return (
    <div
      className="w-5 h-5 rounded-full border-2 transition-all"
      style={{
        borderColor: filled ? '#58cc02' : '#D1D5DB',
        backgroundColor: filled ? '#58cc02' : 'transparent',
        transform: filled ? 'scale(1.1)' : 'scale(1)',
      }}
    />
  )
}

export default function ParentPinEntry({ parentId, onSuccess, onBack }) {
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState(null)
  const [checking, setChecking] = useState(false)

  async function handleDigit(d) {
    if (pin.length >= 4 || checking) return
    const newPin = pin + d
    setPin(newPin)
    setError(null)

    if (newPin.length === 4) {
      setChecking(true)
      try {
        const { data, error: dbErr } = await supabase
          .from('parents')
          .select('pin_hash')
          .eq('id', parentId)
          .single()

        if (dbErr) throw dbErr
        const valid = await verifyPin(newPin, data.pin_hash)
        if (valid) {
          onSuccess()
        } else {
          setError('Wrong PIN. Try again!')
          setPin('')
        }
      } catch (err) {
        setError('Something went wrong. Try again!')
        setPin('')
      } finally {
        setChecking(false)
      }
    }
  }

  function handleDelete() {
    if (checking) return
    setPin(p => p.slice(0, -1))
    setError(null)
  }

  const DIGITS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    [null,'0','del'],
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-5">
        <button onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
          <BackIcon />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center">
          <span className="text-6xl">🔐</span>
          <h1 className="font-display font-bold text-2xl text-gray-900 mt-3">Parent Zone</h1>
          <p className="font-body text-sm text-gray-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div className="flex items-center gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <PinDot key={i} filled={i < pin.length} />
          ))}
        </div>

        {error && (
          <p className="font-body font-bold text-sm text-red-500 -mt-4">{error}</p>
        )}

        {/* Number pad */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          {DIGITS.map((row, ri) => (
            <div key={ri} className="flex gap-3">
              {row.map((d, di) => {
                if (d === null) return <div key={di} className="flex-1" />
                if (d === 'del') return (
                  <button key={di} onClick={handleDelete}
                    className="flex-1 h-16 rounded-2xl bg-gray-100 flex items-center justify-center
                               font-body font-bold text-gray-500 text-lg active:bg-gray-200 transition-colors">
                    ⌫
                  </button>
                )
                return (
                  <button key={di} onClick={() => handleDigit(d)}
                    className="flex-1 h-16 rounded-2xl bg-gray-50 flex items-center justify-center
                               font-display font-bold text-2xl text-gray-900 active:bg-gray-200 transition-colors"
                    style={{ boxShadow: '0 2px 0 #E5E7EB' }}>
                    {d}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
