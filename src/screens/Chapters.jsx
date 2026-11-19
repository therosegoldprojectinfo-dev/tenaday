import { useState, useEffect } from 'react'
import { getChapters, createChapter, deleteChapter, updateChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const EMOJI_OPTIONS = [
  '📐','📖','🔬','🌍','🎨','🎵','🏃','💻','🧮','📝',
  '🦋','🌿','⚗️','🗺️','🎭','📚','🧠','🔭','🏛️','✏️',
  '🧪','🌊','🦁','🎯','🧩','🌸','⚽','🎸','🍎','🚀',
]

function CalendarMonth({ year, month, streakDaysSet, today }) {
  const colHeaders = ['Di','Lu','Ma','Me','Je','Ve','Sa']
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName  = new Date(year, month, 1).toLocaleString('fr', { month: 'long' })
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-2xl mb-3" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="grid grid-cols-7 px-2 pt-3 pb-1">
        {colHeaders.map((h, i) => (
          <div key={i} className="text-center font-body font-bold text-xs" style={{ color: '#aaa' }}>{h}</div>
        ))}
      </div>
      <div className="px-4 pb-1">
        <span className="font-display font-bold text-sm text-ink capitalize">{monthName}</span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 px-2 pb-3">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateKey   = `${year}-${month}-${day}`
          const isStreak  = streakDaysSet.has(dateKey)
          const isToday   = isCurrentMonth && day === today.getDate()
          return (
            <div key={i} className="flex items-center justify-center" style={{ height: 42 }}>
              {isStreak ? (
                <div className="flex flex-col items-center">
                  <img src="/streak-fire.png" alt="🔥" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2d78', marginTop: 1 }} />}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm"
                    style={{
                      background: isToday ? 'rgba(255,45,120,0.08)' : 'transparent',
                      color: isToday ? '#ff2d78' : '#bbb',
                      border: isToday ? '1.5px solid #ff2d78' : 'none',
                    }}>
                    {day}
                  </div>
                  {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2d78' }} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StreakPopupModal({ streak, lang, onClose, accountCreatedAt }) {
  const today        = new Date()
  const currentYear  = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentDay   = today.getDate()

  // Build set of all streak days (key: "year-month-day")
  const streakDaysSet = new Set()
  for (let i = 0; i < streak; i++) {
    const d = new Date(currentYear, currentMonth, currentDay - i)
    streakDaysSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }

  // Figure out earliest month to show (account creation or 3 months ago if no prop)
  const earliest = accountCreatedAt ? new Date(accountCreatedAt) : new Date(currentYear, currentMonth - 2, 1)
  const startYear  = earliest.getFullYear()
  const startMonth = earliest.getMonth()

  // Build list of months from start → current
  const months = []
  let y = startYear, m = startMonth
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    months.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }

  const ctaLabel = lang === 'ar'
    ? `حافظ على سلسلتك لمدة ${streak} أيام 🎮`
    : `🎮 Garde ta série de ${streak} jour${streak > 1 ? 's' : ''}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(10,10,20,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-3xl flex flex-col relative"
        style={{ background: '#F6F5F7', maxHeight: '90dvh' }}
      >
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(0,0,0,0.08)', color: '#333' }}>✕</button>

        {/* Header — centered gif + text + button */}
        <div className="flex-shrink-0 flex flex-col items-center text-center pt-10 pb-5 px-5 gap-3">
          <img src="/firebro.gif" alt="fire" style={{ width: 90, height: 90, objectFit: 'contain' }} />
          <div>
            <p className="font-display font-extrabold text-ink" style={{ fontSize: 26 }}>Compléter un Quiz</p>
            <p className="font-body text-sm mt-1" style={{ color: '#888' }}>pour continuer ta série</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-display font-bold text-base text-ink transition-all active:scale-95 mt-1"
            style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            Débuter un Quiz !
          </button>
        </div>


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
function TopStatsBar({ streak, coinBalance, onOpenStreak, onOpenCoins }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 pb-2 px-5">
      {/* Coins pill */}
      <button
        onClick={onOpenCoins}
        className="flex items-center gap-2 rounded-full transition-all active:scale-95"
        style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb', padding: '10px 20px' }}
      >
        <img src="/coin-flower.png" alt="coins" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        <span className="font-display font-extrabold text-lg text-amber-500">{coinBalance ?? 0}</span>
      </button>

      {/* Streak pill */}
      <button
        onClick={onOpenStreak}
        className="flex items-center gap-2 rounded-full transition-all active:scale-95"
        style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb', padding: '10px 20px' }}
      >
        <img src="/firebro.gif" alt="streak" style={{ width: 32, height: 32, objectFit: 'contain', filter: streak === 0 ? 'grayscale(1) opacity(0.4)' : 'none' }} />
        <span className="font-display font-extrabold text-lg" style={{ color: streak > 0 ? '#ff2d78' : '#9ca3af' }}>{streak}</span>
      </button>
    </div>
  )
}

export default function Chapters({ onSelectChapter, kidId, streak = 0, activeKid, onLeaderboard }) {
  const lang = useLang()
  const [chapters, setChapters]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [emojiTarget, setEmojiTarget]   = useState(null)
  const [showStreak, setShowStreak]     = useState(false)
  const [showCoins,  setShowCoins]      = useState(false)

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

  async function handleDelete(chapter) {
    try {
      await deleteChapter(chapter.id)
      setChapters(prev => prev.filter(c => c.id !== chapter.id))
    } catch (err) {
      console.error('Failed to delete chapter:', err)
    }
  }

  async function handleChangeEmoji(chapter, newEmoji) {
    try {
      await updateChapter(chapter.id, { emoji: newEmoji })
      setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, emoji: newEmoji } : c))
      setEmojiTarget(null)
    } catch (err) {
      console.error('Failed to update emoji:', err)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#ffffff' }}>

      <div className="flex-1 overflow-y-auto px-5 pb-10" style={{ background: '#ffffff' }}>

      {/* Top stats bar — sticky with frosted glass */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        marginLeft: '-20px',
        marginRight: '-20px',
        paddingLeft: '20px',
        paddingRight: '20px',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <TopStatsBar streak={streak} coinBalance={activeKid?.coin_balance} onOpenStreak={() => setShowStreak(true)} onOpenCoins={() => setShowCoins(true)} />
      </div>
        <div className="max-w-2xl mx-auto">

          {/* GIF mascot */}
          <div className="flex justify-center mb-6">
            <img
              src="/gifbro.gif"
              alt="Numio"
              style={{ width: '100%', maxWidth: 360, height: 'auto', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* Add subject row — separate + button and input bar */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all"
              style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2V16M2 9H16" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 text-left rounded-full active:scale-95 transition-all"
              style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '13px 20px' }}
            >
              <span className="font-body text-base" style={{ color: '#9ca3af' }}>Je veux rajouter une Matière</span>
            </button>
          </div>

          {/* Section title */}
          <div className="mb-3">
            <h2 className="font-display font-bold text-lg text-ink">Mes Matières</h2>
          </div>

          {chapters.length === 0 ? (
            <EmptyState lang={lang} onAdd={() => setShowModal(true)} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {chapters.map((chapter, index) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  onClick={() => onSelectChapter(chapter)}
                  onDelete={handleDelete}
                  onChangeEmoji={ch => setEmojiTarget(ch)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showStreak && <StreakPopupModal streak={streak} lang={lang} onClose={() => setShowStreak(false)} />}
      {showCoins  && <CoinsPopupModal coinBalance={activeKid?.coin_balance} lang={lang} onClose={() => setShowCoins(false)} />}

      {showModal && (
        <ChapterModal lang={lang} onConfirm={handleCreate} onClose={() => setShowModal(false)} />
      )}

      {emojiTarget && (
        <EmojiPickerModal
          chapter={emojiTarget}
          onConfirm={newEmoji => handleChangeEmoji(emojiTarget, newEmoji)}
          onClose={() => setEmojiTarget(null)}
        />
      )}
    </div>
  )
}

const CARD_ACCENTS = [
  '#ede9fe', '#fce7f3', '#dbeafe', '#fef9c3',
  '#dcfce7', '#ffedd5', '#ccfbf1', '#fee2e2',
]

function ChapterCard({ chapter, index, onClick, onDelete, onChangeEmoji }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="w-full rounded-3xl bg-white overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'relative' }}
    >
      {/* Colored top with big emoji */}
      <div
        className="flex items-center justify-center"
        style={{ background: accent, height: 110, borderRadius: '24px 24px 0 0', position: 'relative' }}
      >
        <span style={{ fontSize: 58, lineHeight: 1 }}>{chapter.emoji}</span>

        {/* Three-dot button */}
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className="flex items-center justify-center active:scale-95 transition-all"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.75)', border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="2.5" r="1.3" fill="#1a1a2e"/>
            <circle cx="7" cy="7"   r="1.3" fill="#1a1a2e"/>
            <circle cx="7" cy="11.5" r="1.3" fill="#1a1a2e"/>
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            {/* backdrop to close */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={e => { e.stopPropagation(); setMenuOpen(false) }}
            />
            <div
              style={{
                position: 'absolute', top: 42, right: 10, zIndex: 50,
                background: 'white', borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                minWidth: 170, overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setMenuOpen(false); onChangeEmoji(chapter) }}
                className="w-full text-left flex items-center gap-2 font-body font-bold text-sm text-ink transition-all active:scale-95"
                style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}
              >
                <span style={{ fontSize: 16 }}>🎨</span> Changer d'émojie
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(chapter) }}
                className="w-full text-left flex items-center gap-2 font-body font-bold text-sm transition-all active:scale-95"
                style={{ padding: '12px 16px', color: '#ef4444' }}
              >
                <span style={{ fontSize: 16 }}>🗑️</span> Supprimer matière
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom content */}
      <div className="px-4 pt-3 pb-4">
        <p className="font-display font-extrabold text-base text-ink truncate mb-0.5">{chapter.name}</p>
        <p className="font-body text-xs mb-3" style={{ color: '#9ca3af' }}>
          {chapter.quiz_count ?? 0} quiz terminés
        </p>
        <button
          onClick={onClick}
          className="w-full py-2.5 rounded-full font-display font-bold text-sm text-ink transition-all active:scale-95"
          style={{ background: '#F5F5F5', border: '1.5px solid #e5e7eb', fontSize: 12 }}
        >
          Débuter un quiz !
        </button>
      </div>
    </div>
  )
}

function EmojiPickerModal({ chapter, onConfirm, onClose }) {
  const [selected, setSelected] = useState(chapter.emoji)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center md:justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full md:max-w-lg md:rounded-3xl bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '70dvh' }}>
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-5">
          <h2 className="font-display font-extrabold text-xl text-ink text-center pt-2">
            Changer d'émojie
          </h2>
          <div className="flex justify-center">
            <span style={{ fontSize: 52 }}>{selected}</span>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setSelected(e)}
                className="h-11 w-full rounded-xl text-xl flex items-center justify-center border-2 transition-all"
                style={{ borderColor: selected === e ? '#7c3aed' : '#f3f4f6', background: selected === e ? '#f5f3ff' : '#f9fafb' }}>
                {e}
              </button>
            ))}
          </div>
          <button onClick={() => onConfirm(selected)}
            className="w-full text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            Confirmer
          </button>
          <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-2 text-center">
            Annuler
          </button>
        </div>
      </div>
    </div>
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
