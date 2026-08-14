import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'

export default function Paywall({ daysLeft = 0, onBack }) {
  const lang = useLang()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const isExpired = daysLeft === 0

  async function handleSubscribe() {
    setLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      setError(e.message || (lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong'))
      setLoading(false)
    }
  }

  return (
    <div className="bg-white flex flex-col items-center justify-center px-6 text-center" style={{ height: '100dvh' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Mascot */}
        <div style={{ animation: 'float 3s ease-in-out infinite' }}>
          <img src="/nav-profile.png" alt="" className="w-36 h-auto" />
        </div>

        {/* Title */}
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-2">
            {isExpired
              ? (lang === 'ar' ? 'انتهت تجربتك المجانية' : 'Your free trial ended')
              : (lang === 'ar' ? `يتبقى ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} في تجربتك` : `${daysLeft} day${daysLeft > 1 ? 's' : ''} left in your trial`)}
          </h1>
          <p className="font-body text-base text-muted leading-relaxed">
            {lang === 'ar'
              ? 'اشترك للاستمرار في تحويل الكتب المدرسية إلى اختبارات ممتعة لطفلك!'
              : 'Subscribe to keep turning textbooks into fun quizzes for your child!'}
          </p>
        </div>

        {/* Price card */}
        <div className="w-full rounded-3xl p-6 flex flex-col items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
          <p className="font-body text-sm text-white/70 uppercase tracking-widest font-bold">
            {lang === 'ar' ? 'الخطة الشهرية' : 'Monthly plan'}
          </p>
          <div className="flex items-end gap-1">
            <span className="font-display font-extrabold text-5xl text-white">$0.50</span>
            <span className="font-body text-white/70 text-base mb-1">
              {lang === 'ar' ? '/شهر' : '/month'}
            </span>
          </div>
          <p className="font-body text-sm text-white/70">
            {lang === 'ar' ? 'اختبارات غير محدودة · منطقة الوالدين · مكافآت' : 'Unlimited quizzes · Parent zone · Rewards'}
          </p>
        </div>

        {/* Features */}
        <div className="w-full flex flex-col gap-2">
          {(lang === 'ar'
            ? ['📸 اختبارات غير محدودة من الصور', '🏆 نظام العملات والمكافآت', '👨‍👩‍👧 منطقة الوالدين الكاملة', '🌍 دعم العربية والإنجليزية']
            : ['📸 Unlimited photo-to-quiz generation', '🏆 Coins & rewards system', '👨‍👩‍👧 Full parent zone', '🌍 Arabic & English support']
          ).map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-left">
              <span className="font-body text-sm font-bold text-ink">{f}</span>
            </div>
          ))}
        </div>

        {error && <p className="font-body text-sm font-bold" style={{ color: '#ef4444' }}>{error}</p>}

        {/* Subscribe button */}
        <button onClick={handleSubscribe} disabled={loading}
          className="w-full disabled:opacity-50 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
          {loading
            ? (lang === 'ar' ? 'جاري التحويل...' : 'Redirecting...')
            : (lang === 'ar' ? 'اشترك الآن ←' : 'Subscribe now →')}
        </button>

        {onBack && !isExpired && (
          <button onClick={onBack} className="font-body text-sm text-muted py-1">
            {lang === 'ar' ? 'ليس الآن' : 'Not now'}
          </button>
        )}
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
