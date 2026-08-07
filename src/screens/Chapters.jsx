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

// Generate the last 7 days for the streak row
function getLast7Days() {
  const days = []
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ date: d.getDate(), day: dayNames[d.getDay()], isToday: i === 0 })
  }
  return days
}

function StreakRow({ streak, lang }) {
  const days = getLast7Days()
  // How many of the last days are "active" based on streak count
  const activeCount = Math.min(streak, 7)

  return (
    <div className="flex-shrink-0 mb-6">
      {/* Headline */}
      <div className="mb-4">
        {streak > 0 ? (
          <>
            <h2 className="font-display font-extrabold text-2xl text-ink">
              {lang === 'ar' ? `أنت على سلسلة ${streak} أيام 🔥` : `You're on a ${streak} day streak 🔥`}
            </h2>
            <p className="font-body text-sm text-muted mt-0.5">
              {lang === 'ar' ? 'استمر في التعلم كل يوم!' : 'Keep learning every day!'}
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display font-extrabold text-2xl text-ink">
              {lang === 'ar' ? 'ابدأ سلسلتك اليوم! ⚡' : 'Start your streak today! ⚡'}
            </h2>
            <p className="font-body text-sm text-muted mt-0.5">
              {lang === 'ar' ? 'أكمل اختباراً كل يوم لبناء سلسلة' : 'Complete a quiz daily to build a streak'}
            </p>
          </>
        )}
      </div>

      {/* Day pills row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const isActive = i >= (7 - activeCount)
          const isToday  = d.isToday
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className="flex items-center justify-center font-display font-extrabold transition-all"
                style={{
                  width: 44,
                  height: 52,
                  borderRadius: 20,
                  fontSize: 18,
                  background: isToday && isActive ? '#7c3aed'
                    : isToday ? '#f5f3ff'
                    : isActive ? '#ede9fe'
                    : '#f3f4f6',
                  color: isToday && isActive ? 'white'
                    : isToday ? '#7c3aed'
                    : isActive ? '#7c3aed'
                    : '#d1d5db',
                  boxShadow: isToday && isActive ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
                }}
              >
                {d.date}
              </div>
              <span className="font-body text-xs" style={{ color: isToday ? '#7c3aed' : '#AFAFAF' }}>
                {d.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Chapters({ onSelectChapter, kidId, streak = 0 }) {
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
          <StreakRow streak={streak} lang={lang} />

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
