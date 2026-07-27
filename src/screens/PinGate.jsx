import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function PinGate({ onSuccess, onBack }) {
  const lang = useLang()
  const [pin, setPin]         = useState(['', '', '', ''])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake]     = useState(false)
  const inputs = useRef([])

  useEffect(() => { inputs.current[0]?.focus() }, [])

  function handleChange(val, i) {
    if (!/^\d?$/.test(val)) return
    const next = [...pin]
    next[i] = val
    setPin(next)
    setError('')
    if (val && i < 3) inputs.current[i + 1]?.focus()
    if (val && i === 3) {
      const full = [...next].join('')
      if (full.length === 4) verify(full)
    }
  }

  function handleKeyDown(e, i) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  async function hashPin(pinRaw) {
    const input = `numio-pin:${pinRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function verify(code) {
    setLoading(true)
    try {
      // Hash PIN client-side before sending — plaintext PIN never leaves the device
      const pinHash = await hashPin(code)
      const { data, error } = await supabase.rpc('verify_parent_pin', { input_pin: pinHash })
      if (error) throw error
      if (data === true) {
        onSuccess()
      } else {
        setShake(true)
        setError(t(lang, 'pin_wrong'))
        setPin(['', '', '', ''])
        setTimeout(() => { setShake(false); inputs.current[0]?.focus() }, 600)
      }
    } catch {
      setError(t(lang, 'pin_error'))
    } finally {
      setLoading(false)
    }
  }

  const filled = pin.join('')

  return (
    <div className="bg-white flex flex-col items-center justify-center px-6 gap-8" style={{ height: '100dvh' }}>
      <button onClick={onBack} className="absolute top-12 text-muted font-body font-bold text-sm flex items-center gap-1 active:opacity-60" style={{ insetInlineStart: 20 }}>
        {t(lang, 'pin_back')}
      </button>
      <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
      <div className="text-center">
        <h1 className="font-display font-extrabold text-3xl text-ink">{t(lang, 'pin_title')}</h1>
        <p className="font-body text-base text-muted mt-1">{t(lang, 'pin_sub')}</p>
      </div>
      <div className="flex gap-4" style={{ animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(e.target.value, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            className={`w-16 h-16 text-center text-3xl font-display font-extrabold rounded-2xl border-2 outline-none transition-all ${
              digit ? 'border-duo bg-green-50 text-duo' : 'border-gray-200 bg-gray-50 text-ink'
            } ${error ? 'border-red-300 bg-red-50' : ''}`}
          />
        ))}
      </div>
      {error && <p className="font-body font-bold text-sm text-red-500">{error}</p>}
      <button
        onClick={() => verify(filled)}
        disabled={filled.length < 4 || loading}
        className="w-full max-w-xs bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: filled.length === 4 ? '0 4px 0 #46a302' : 'none' }}
      >
        {loading ? t(lang, 'pin_checking') : t(lang, 'pin_enter')}
      </button>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-10px); }
          40%       { transform: translateX(10px); }
          60%       { transform: translateX(-10px); }
          80%       { transform: translateX(10px); }
        }
      `}</style>
    </div>
  )
}
