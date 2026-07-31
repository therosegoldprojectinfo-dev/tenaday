import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function PinGate({ onSuccess, onBack }) {
  const lang = useLang()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  async function hashPassword(pwRaw) {
    const input = `numio-pin:${pwRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function verify() {
    if (!password) return
    setLoading(true)
    try {
      const pwHash = await hashPassword(password)
      const { data, error } = await supabase.rpc('verify_parent_pin', { input_pin: pwHash })
      if (error) throw error
      if (data === true) {
        onSuccess()
      } else {
        setShake(true)
        setError(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Wrong password')
        setPassword('')
        setTimeout(() => setShake(false), 600)
      }
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white flex flex-col items-center justify-center px-6 gap-8" style={{ height: '100dvh' }} dir={dir}>
      <button onClick={onBack}
        className="absolute top-12 text-muted font-body font-bold text-sm flex items-center gap-1 active:opacity-60"
        style={{ insetInlineStart: 20 }}>
        {t(lang, 'pin_back')}
      </button>

      <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />

      <div className="text-center">
        <h1 className="font-display font-extrabold text-3xl text-ink">
          {lang === 'ar' ? 'منطقة الوالدين 🔒' : 'Parent Zone 🔒'}
        </h1>
        <p className="font-body text-base text-muted mt-1">
          {lang === 'ar' ? 'أدخل كلمة المرور للمتابعة' : 'Enter your password to continue'}
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3"
        style={{ animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
          autoFocus
          className={`w-full border-2 rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none transition-all text-center ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-duo'
          }`}
        />
        {error && <p className="font-body font-bold text-sm text-red-500 text-center">{error}</p>}
      </div>

      <button
        onClick={verify}
        disabled={!password || loading}
        className="w-full max-w-xs bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: password ? '0 4px 0 #46a302' : 'none' }}>
        {loading
          ? (lang === 'ar' ? 'جاري التحقق...' : 'Checking...')
          : (lang === 'ar' ? 'دخول' : 'Enter')}
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
