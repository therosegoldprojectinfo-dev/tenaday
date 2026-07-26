import { useState, useEffect } from 'react'
import { getChapters, createChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const EMOJI_OPTIONS = [
  '📐','📖','🔬','🌍','🎨','🎵','🏃','💻','🧮','📝',
  '🦋','🌿','⚗️','🗺️','🎭','📚','🧠','🔭','🏛️','✏️',
  '🧪','🌊','🦁','🎯','🧩','🌸','⚽','🎸','🍎','🚀',
]

const BANNER_COLORS = [
  { bg: '#e0f2fe', border: '#7dd3fc' },
  { bg: '#fce7f3', border: '#f9a8d4' },
  { bg: '#dcfce7', border: '#86efac' },
  { bg: '#fef9c3', border: '#fde047' },
  { bg: '#ede9fe', border: '#c4b5fd' },
  { bg: '#ffedd5', border: '#fdba74' },
  { bg: '#ccfbf1', border: '#5eead4' },
  { bg: '#fee2e2', border: '#fca5a5' },
]

export default function Chapters({ onSelectChapter, kidId }) {
  const lang = useLang()
  const [chapters, setChapters]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { if (kidId) loadChapters() }, [kidId])

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
    <div className="min-h-screen bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-10">
        <div className="max-w-2xl mx-auto">
          {chapters.length === 0 ? (
            <EmptyState lang={lang} onAdd={() => setShowModal(true)} />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {chapters.map((chapter, index) => (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    colorIndex={index}
                    lang={lang}
                    onClick={() => onSelectChapter(chapter)}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-muted font-display font-bold text-base active:bg-gray-50 hover:bg-gray-50 transition-colors"
              >
                {t(lang, 'chapters_add')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ChapterModal
          lang={lang}
          onConfirm={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function ChapterCard({ chapter, colorIndex, lang, onClick }) {
  const color = BANNER_COLORS[colorIndex % BANNER_COLORS.length]
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-3xl bg-white overflow-hidden transition-all active:translate-y-1"
      style={{ border: `2px solid ${color.border}`, boxShadow: `0 4px 0 ${color.border}` }}
    >
      <div className="relative flex items-center justify-center" style={{ background: color.bg, height: 140 }}>
        <span style={{ fontSize: 72 }}>{chapter.emoji}</span>
      </div>
      <div className="px-5 py-4">
        <p className="font-display font-extrabold text-xl text-ink">{chapter.name}</p>
        <p className="font-body text-sm text-muted mt-0.5">{t(lang, 'chapters_tap')}</p>
      </div>
    </button>
  )
}

function EmptyState({ lang, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-6 text-center px-4">
      <span style={{ fontSize: 72 }}>📭</span>
      <div>
        <p className="font-display font-extrabold text-2xl text-ink">{t(lang, 'chapters_empty_title')}</p>
        <p className="text-muted font-body text-base mt-2">{t(lang, 'chapters_empty_sub')}</p>
      </div>
      <button
        onClick={onAdd}
        className="w-full max-w-xs bg-duo active:bg-duo-dark text-white font-display font-bold text-lg rounded-2xl py-5 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all"
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
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '90dvh' }}>
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
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t(lang, 'chapters_modal_name_placeholder')}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {t(lang, 'chapters_modal_icon_label')}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-11 w-full rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
                    emoji === e ? 'border-duo bg-green-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <span style={{ fontSize: 28 }}>{emoji}</span>
            <span className="font-display font-bold text-lg text-ink">
              {name || t(lang, 'chapters_modal_name_placeholder')}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="w-full bg-duo active:bg-duo-dark disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all"
          >
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
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
    </div>
  )
}
