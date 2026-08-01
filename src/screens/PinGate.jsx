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
    } catch (e) {
      const isLocked = e?.message?.toLowerCase().includes('locked') ||
                       e?.message?.toLowerCase().includes('too many') ||
                       e?.code === 'P0001'
      if (isLocked) {
        setError(lang === 'ar'
          ? 'تم قفل الحساب مؤقتاً. انتظر 15 دقيقة أو تواصل معنا عبر واتساب.'
          : 'Account temporarily locked. Wait 15 min or contact us on WhatsApp.')
      } else {
        setError(lang === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.')
      }
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
        {error && (
          <div className="text-center">
            <p className="font-body font-bold text-sm text-red-500">{error}</p>
            {(error.includes('locked') || error.includes('قفل')) && (
              <a
                href="https://wa.me/14384104068?text=Hi%2C%20I%20am%20locked%20out%20of%20my%20Numio%20Parent%20Zone."
                target="_blank"
                rel="noopener noreferrer"
                className="font-body font-bold text-sm text-duo underline mt-1 block"
              >
                {lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us on WhatsApp'}
              </a>
            )}
          </div>
        )}
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
