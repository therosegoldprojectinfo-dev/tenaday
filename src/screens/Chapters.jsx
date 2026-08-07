import { useState, useEffect } from 'react'
import { getChapters, createChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const EMOJI_OPTIONS = [
  '📐','📖','🔬','🌍','🎨','🎵','🏃','💻','🧮','📝',
  '🦋','🌿','⚗️','🗺️','🎭','📚','🧠','🔭','🏛️','✏️',
  '🧪','🌊','🦁','🎯','🧩','🌸','⚽','🎸','🍎','🚀',
]

const CARD_ACCENTS = [
  '#ede9fe', '#fce7f3', '#dbeafe', '#fef9c3',
  '#dcfce7', '#ffedd5', '#ccfbf1', '#fee2e2',
]

function StreakPopupModal({ streak, lang, onClose }) {
  // Build last 7 days with active state
  const dayLetters = lang === 'ar'
    ? ['ح','س','خ','أ','ث','ث','إ']
    : ['S','M','T','W','T','F','S']
  const today = new Date().getDay()
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = (today - 6 + i + 7) % 7
    const isActive = i >= (7 - Math.min(streak, 7))
    const isToday  = i === 6
    return { letter: dayLetters[dayIndex], isActive, isToday }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,10,20,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-3xl flex flex-col items-center gap-6 py-10 px-6 text-center relative"
        style={{ background: '#1a1a2e' }}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>✕</button>

        <p className="font-display font-bold text-sm text-white/50 uppercase tracking-widest">
          {lang === 'ar' ? 'سلسلتك' : 'Streak'}
        </p>

        {/* Fire mascot */}
        <img
          src="/streak-fire.png"
          alt="streak"
          className="w-36 h-auto"
          style={{ filter: streak === 0 ? 'grayscale(1) opacity(0.4)' : 'none', animation: streak > 0 ? 'float 2s ease-in-out infinite' : 'none' }}
        />

        {/* Count */}
        <div>
          <p className="font-display font-extrabold text-5xl text-white">
            {streak} <span style={{ color: streak > 0 ? '#ff2d78' : '#6b7280' }}>{lang === 'ar' ? 'يوم' : streak === 1 ? 'Day' : 'Day'}</span>
          </p>
          <p className="font-display font-extrabold text-2xl text-white/80 mt-1">
            {lang === 'ar' ? 'سلسلة!' : 'Streak!'}
          </p>
        </div>

        {/* Weekly checkmarks */}
        <div className="flex gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm"
                style={{
                  background: d.isActive ? '#ff2d78' : 'rgba(255,255,255,0.1)',
                  color: d.isActive ? 'white' : 'rgba(255,255,255,0.3)',
                }}>
                {d.isActive ? '✓' : d.letter}
              </div>
              <span className="font-body text-xs" style={{ color: d.isToday ? '#ff2d78' : 'rgba(255,255,255,0.3)' }}>
                {d.letter}
              </span>
            </div>
          ))}
        </div>

        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {streak > 0
            ? (lang === 'ar' ? 'أكمل اختباراً اليوم للحفاظ على سلسلتك!' : 'Complete a quiz today to keep your streak going!')
            : (lang === 'ar' ? 'أكمل اختباراً اليوم لبدء سلسلتك!' : 'Complete a quiz today to start your streak!')}
        </p>

        <button onClick={onClose}
          className="w-full py-4 rounded-2xl font-display font-bold text-lg text-white transition-all active:scale-95"
          style={{ background: '#ff2d78', boxShadow: '0 4px 0 #c4005a' }}>
          {lang === 'ar' ? 'حسناً! 💪' : 'Let\'s go! 💪'}
        </button>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}

function CoinsPopupModal({ coinBalance, lang, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,10,20,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-3xl flex flex-col items-center gap-6 py-10 px-6 text-center relative"
        style={{ background: '#1a1200' }}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>✕</button>

        <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'rgba(255,200,0,0.6)' }}>
          {lang === 'ar' ? 'عملاتك' : 'Your Coins'}
        </p>

        {/* Coin mascot */}
        <div style={{ animation: 'float 2s ease-in-out infinite' }}>
          <img src="/coin-flower.png" alt="coins" className="w-40 h-auto" />
        </div>

        {/* Balance */}
        <div>
          <p className="font-display font-extrabold text-6xl" style={{ color: '#fbbf24' }}>{coinBalance ?? 0}</p>
          <p className="font-display font-bold text-xl mt-1" style={{ color: 'rgba(251,191,36,0.6)' }}>
            {lang === 'ar' ? 'عملة' : 'coins'}
          </p>
        </div>

        <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {lang === 'ar'
            ? 'اكسب عملات بإكمال الاختبارات وصرفها على مكافآت!'
            : 'Earn coins by completing quizzes and spend them on rewards!'}
        </p>

        <button onClick={onClose}
          className="w-full py-4 rounded-2xl font-display font-bold text-lg transition-all active:scale-95"
          style={{ background: '#fbbf24', color: '#78350f', boxShadow: '0 4px 0 #d97706' }}>
          {lang === 'ar' ? 'رائع! 🎁' : 'Awesome! 🎁'}
        </button>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}

function StreakRow({ streak, lang, coinBalance }) {
  const [showStreak, setShowStreak] = useState(false)
  const [showCoins,  setShowCoins]  = useState(false)

  return (
    <div className="flex-shrink-0 mb-6">
      {/* Headline */}
      <div className="mb-4">
        <h2 className="font-display font-extrabold text-2xl text-ink">
          {streak > 0
            ? (lang === 'ar' ? 'استمر في التعلم كل يوم!' : 'Keep learning every day!')
            : (lang === 'ar' ? 'ابدأ سلسلتك اليوم!' : 'Start your streak today!')}
        </h2>
        <p className="font-body text-sm text-muted mt-0.5">
          {lang === 'ar' ? 'أكمل اختباراً كل يوم لبناء سلسلة' : 'Complete a quiz daily to build a streak'}
        </p>
      </div>

      {/* Streak + Coins stats */}
      <div className="flex gap-3">
        {/* Streak card */}
        <button onClick={() => setShowStreak(true)}
          className="flex items-center gap-2 rounded-2xl px-4 py-3 flex-1 text-left transition-all active:scale-95"
          style={{ background: streak > 0 ? '#fff0f6' : '#f9fafb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <img src="/streak-fire.png" alt="streak" className="w-10 h-10 object-contain flex-shrink-0"
            style={{ filter: streak === 0 ? 'grayscale(1) opacity(0.4)' : 'none' }} />
          <div>
            <p className="font-display font-extrabold text-2xl" style={{ color: streak > 0 ? '#ff2d78' : '#d1d5db', lineHeight: 1 }}>{streak}</p>
            <p className="font-body text-xs text-muted">{lang === 'ar' ? 'أيام' : 'day streak'}</p>
          </div>
        </button>

        {/* Coins card */}
        <button onClick={() => setShowCoins(true)}
          className="flex items-center gap-2 rounded-2xl px-4 py-3 flex-1 text-left transition-all active:scale-95"
          style={{ background: '#fffbeb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <img src="/coin-flower.png" alt="coins" className="w-10 h-10 object-contain flex-shrink-0" />
          <div>
            <p className="font-display font-extrabold text-2xl text-amber-500" style={{ lineHeight: 1 }}>{coinBalance ?? 0}</p>
            <p className="font-body text-xs text-muted">{lang === 'ar' ? 'عملات' : 'coins'}</p>
          </div>
        </button>
      </div>

      {showStreak && <StreakPopupModal streak={streak} lang={lang} onClose={() => setShowStreak(false)} />}
      {showCoins  && <CoinsPopupModal coinBalance={coinBalance} lang={lang} onClose={() => setShowCoins(false)} />}
    </div>
  )
}

export default function Chapters({ onSelectChapter, kidId, streak = 0, activeKid }) {
  const lang = useLang()
  const [chapters, setChapters]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (kidId) loadChapters()
    else setLoading(false)
  }, [kidId])

  async function loadChapters() {
    try {
      const data = await getChapters(kidId)
      setChapters(data)
    } catch (err) {
      console.error('Failed to load chapters:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(name, emoji) {
    try {
      const chapter = await createChapter({ name, emoji, kidId })
      setChapters(prev => [...prev, chapter])
      setShowModal(false)
    } catch (err) {
      console.error('Failed to create chapter:', err)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-10">
        <div className="max-w-2xl mx-auto">

          {/* Streak row */}
          <StreakRow streak={streak} lang={lang} coinBalance={activeKid?.coin_balance} />

          {/* Section title */}
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl text-ink">
              {lang === 'ar' ? 'فصولي' : 'My Chapters'}
            </h1>
            <p className="font-body text-sm text-muted mt-0.5">
              {lang === 'ar' ? 'اختر فصلاً لتبدأ' : 'Pick a chapter to start learning'}
            </p>
          </div>

          {chapters.length === 0 ? (
            <EmptyState lang={lang} onAdd={() => setShowModal(true)} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {chapters.map((chapter, index) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    accent={CARD_ACCENTS[index % CARD_ACCENTS.length]}
                    lang={lang}
                    onClick={() => onSelectChapter(chapter)}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
                style={{ border: '2px dashed #c4b5fd', color: '#7c3aed', background: 'white' }}
              >
                {t(lang, 'chapters_add')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ChapterModal lang={lang} onConfirm={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}

function ChapterCard({ chapter, accent, lang, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-3xl bg-white overflow-hidden transition-all active:scale-95"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-center" style={{ background: accent, height: 110, borderRadius: '24px 24px 0 0' }}>
        <span style={{ fontSize: 56 }}>{chapter.emoji}</span>
      </div>
      <div className="px-4 py-3">
        <p className="font-display font-extrabold text-base text-ink truncate">{chapter.name}</p>
        <p className="font-body text-xs text-muted mt-0.5">{t(lang, 'chapters_tap')}</p>
      </div>
    </button>
  )
}

function EmptyState({ lang, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center pt-10 gap-6 text-center px-4">
      <div style={{ animation: 'float 3s ease-in-out infinite' }}>
        <img src="/nav-profile.png" alt="" className="w-32 h-auto" />
      </div>
      <div>
        <p className="font-display font-extrabold text-2xl text-ink">{t(lang, 'chapters_empty_title')}</p>
        <p className="text-muted font-body text-base mt-2">{t(lang, 'chapters_empty_sub')}</p>
      </div>
      <button
        onClick={onAdd}
        className="w-full max-w-xs text-white font-display font-bold text-lg rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}
      >
        {t(lang, 'chapters_empty_cta')}
      </button>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}

function ChapterModal({ lang, onConfirm, onClose }) {
  const [name, setName]     = useState('')
  const [emoji, setEmoji]   = useState('📐')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await onConfirm(name.trim(), emoji)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center md:justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-lg md:rounded-3xl bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '90dvh' }}>
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-5">
          <h2 className="font-display font-extrabold text-2xl text-ink text-center pt-2">
            {t(lang, 'chapters_modal_title')}
          </h2>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {t(lang, 'chapters_modal_name_label')}
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t(lang, 'chapters_modal_name_placeholder')}
              className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {t(lang, 'chapters_modal_icon_label')}
            </label>
            <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className="h-11 w-full rounded-xl text-xl flex items-center justify-center border-2 transition-all"
                  style={{ borderColor: emoji === e ? '#7c3aed' : '#f3f4f6', background: emoji === e ? '#f5f3ff' : '#f9fafb' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#f5f3ff' }}>
            <span style={{ fontSize: 28 }}>{emoji}</span>
            <span className="font-display font-bold text-lg text-ink">
              {name || t(lang, 'chapters_modal_name_placeholder')}
            </span>
          </div>
          <button onClick={handleSubmit} disabled={!name.trim() || saving}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {saving ? t(lang, 'chapters_modal_creating') : t(lang, 'chapters_modal_cta')}
          </button>
          <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-2 text-center">
            {t(lang, 'chapters_modal_cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
    </div>
  )
}
