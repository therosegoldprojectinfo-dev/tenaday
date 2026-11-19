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
  const today = new Date()
  const currentYear  = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDay   = today.getDate()

  // Build a grid of days for the current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0=Sun
  const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Which days in this month have streak? 
  // We know the streak count — mark the last `streak` days up to and including today
  const streakDays = new Set()
  for (let i = 0; i < streak; i++) {
    const d = new Date(currentYear, currentMonth, currentDay - i)
    if (d.getMonth() === currentMonth) streakDays.add(d.getDate())
  }

  const monthName = today.toLocaleString(lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'fr', { month: 'long' })

  const colHeaders = lang === 'ar'
    ? ['ح','إ','ث','ث','أ','خ','س']
    : ['Di','Lu','Ma','Me','Je','Ve','Sa']

  // Build calendar cells (pad start)
  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const title    = lang === 'ar' ? `حافظ على سلسلتك لمدة ${streak} أيام` : `Garde ta série de ${streak} jour${streak > 1 ? 's' : ''}`
  const subtitle = lang === 'ar' ? 'إبقِ سلسلتك مشتعلة!' : ''
  const ctaLabel = lang === 'ar' ? `حافظ على سلسلتك لمدة ${streak} أيام 🎮` : `🎮 Garde ta série de ${streak} jour${streak > 1 ? 's' : ''}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(10,10,20,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-3xl flex flex-col px-5 pt-6 pb-8 relative"
        style={{ background: '#F6F5F7' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.08)', color: '#333' }}
        >✕</button>

        {/* Header */}
        <div className="text-center mb-4 mt-2">
          <p className="font-display font-bold text-ink text-lg leading-tight">Garde ta</p>
          <p className="font-display font-extrabold text-ink leading-tight" style={{ fontSize: 32 }}>
            Série de {streak} jour{streak > 1 ? 's' : ''}
          </p>
        </div>

        {/* Streak pill */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <img src="/firebro.gif" alt="fire" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <p className="font-display font-extrabold text-base text-ink">
              {streak} question{streak > 1 ? 's' : ''}
            </p>
            <p className="font-body text-xs" style={{ color: '#888' }}>pour continuer ta série</p>
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Col headers */}
          <div className="grid grid-cols-7 px-2 pt-3 pb-1">
            {colHeaders.map((h, i) => (
              <div key={i} className="text-center font-body font-bold text-xs" style={{ color: '#aaa' }}>{h}</div>
            ))}
          </div>
          {/* Month label */}
          <div className="px-4 pb-1">
            <span className="font-display font-bold text-sm text-ink capitalize">{monthName}</span>
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-1 px-2 pb-3">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isStreak  = streakDays.has(day)
              const isToday   = day === currentDay
              return (
                <div key={i} className="flex items-center justify-center" style={{ height: 42 }}>
                  {isStreak ? (
                    <div className="flex flex-col items-center gap-0" style={{ position: 'relative' }}>
                      <img src="/streak-fire.png" alt="🔥" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                      {isToday && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2d78', marginTop: 1 }} />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm"
                        style={{
                          background: isToday ? 'rgba(255,45,120,0.08)' : 'transparent',
                          color: isToday ? '#ff2d78' : '#bbb',
                          border: isToday ? '1.5px solid #ff2d78' : 'none',
                        }}
                      >
                        {day}
                      </div>
                      {isToday && (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2d78' }} />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-4 rounded-2xl font-display font-bold text-base text-white transition-all active:scale-95"
          style={{ background: '#1a1a2e', boxShadow: '0 4px 0 #000' }}
        >
          {ctaLabel}
        </button>
      </div>
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
        <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>✕</button>
        <p className="font-display font-bold text-sm uppercase tracking-widest" style={{ color: 'rgba(255,200,0,0.6)' }}>
          {lang === 'ar' ? 'عملاتك' : 'Your Coins'}
        </p>
        <div style={{ animation: 'float 2s ease-in-out infinite' }}>
          <img src="/coin-flower.png" alt="coins" className="w-40 h-auto" />
        </div>
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

/* ── Small top-right streak + coins bar ── */
function TopStatsBar({ streak, coinBalance, lang }) {
  const [showStreak, setShowStreak] = useState(false)
  const [showCoins,  setShowCoins]  = useState(false)

  return (
    <>
      <div className="flex items-center justify-end gap-2 pt-12 pb-2 px-5">
        {/* Coins pill */}
        <button
          onClick={() => setShowCoins(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 transition-all active:scale-95"
          style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb' }}
        >
          <img src="/coin-flower.png" alt="coins" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span className="font-display font-extrabold text-base text-amber-500">{coinBalance ?? 0}</span>
        </button>

        {/* Streak pill */}
        <button
          onClick={() => setShowStreak(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 transition-all active:scale-95"
          style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb' }}
        >
          <img src="/firebro.gif" alt="streak" style={{ width: 28, height: 28, objectFit: 'contain', filter: streak === 0 ? 'grayscale(1) opacity(0.4)' : 'none' }} />
          <span className="font-display font-extrabold text-base" style={{ color: streak > 0 ? '#ff2d78' : '#9ca3af' }}>{streak}</span>
        </button>
      </div>

      {showStreak && <StreakPopupModal streak={streak} lang={lang} onClose={() => setShowStreak(false)} />}
      {showCoins  && <CoinsPopupModal coinBalance={coinBalance} lang={lang} onClose={() => setShowCoins(false)} />}
    </>
  )
}

export default function Chapters({ onSelectChapter, kidId, streak = 0, activeKid, onLeaderboard }) {
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
    <div className="flex flex-col" style={{ height: '100dvh', background: '#ffffff' }}>

      {/* Top stats bar — small streak + coins top right */}
      <TopStatsBar streak={streak} coinBalance={activeKid?.coin_balance} lang={lang} />

      <div className="flex-1 overflow-y-auto px-5 pb-10" style={{ background: '#ffffff' }}>
        <div className="max-w-2xl mx-auto">

          {/* GIF mascot */}
          <div className="flex justify-center mb-6">
            <img
              src="/gifbro.gif"
              alt="Numio"
              style={{ width: '100%', maxWidth: 360, height: 'auto', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* Leaderboard link */}
          <button
            onClick={onLeaderboard}
            className="flex items-center gap-1.5 mb-5 active:opacity-60 transition-all"
          >
            <span className="font-body font-bold text-sm" style={{ color: '#7c3aed' }}>
              {lang === 'ar' ? 'تحقق من لوحة نجوم Numio' : 'Check the Numio Stars leaderboard'}
            </span>
            <span style={{ color: '#7c3aed', fontSize: 13 }}>→</span>
          </button>

          {/* Section title */}
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl text-ink">
              {lang === 'ar' ? 'موادي' : 'My Subjects'}
            </h1>
            <p className="font-body text-sm text-muted mt-0.5">
              {lang === 'ar' ? 'اختر مادة لتبدأ' : 'Pick a subject to start learning'}
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
      <img src="/gifbro.gif" alt="" style={{ width: 120, height: 'auto', mixBlendMode: 'multiply' }} />
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
