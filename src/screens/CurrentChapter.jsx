import { useState, useEffect, useRef } from 'react'
import { getExamsForChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'

const ACCENTS = ['#ede9fe', '#fce7f3', '#dbeafe', '#fef9c3', '#dcfce7', '#ffedd5']

export default function CurrentChapter({ chapter, onNew, onRevision, onSelectExam, onBack }) {
  const lang = useLang()
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef(null)
  const [inputKey, setInputKey] = useState(0)

  function handleFilesPicked(e) {
    const file = e.target.files?.[0]
    setInputKey(k => k + 1)
    if (file) onNew(chapter, [file])
  }

  useEffect(() => { if (chapter?.id) loadExams() }, [chapter?.id])

  async function loadExams() {
    try {
      const data = await getExamsForChapter(chapter.id)
      setExams(data)
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  const count = exams.length

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="w-full max-w-2xl mx-auto px-5 flex flex-col flex-1 overflow-y-auto overflow-x-hidden pb-10 min-w-0">

        {/* Retour */}
        <button
          onClick={onBack}
          className="flex-shrink-0 font-body font-bold text-sm mt-12 mb-5 flex items-center gap-1.5 active:opacity-60 self-start"
          style={{ color: '#9ca3af' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>

        {/* Subject name + exam count */}
        <div className="flex-shrink-0 flex items-center gap-4 mb-2">
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-2xl text-ink truncate">{chapter.name}</h1>
            <p className="font-body text-sm mt-0.5" style={{ color: '#9ca3af' }}>
              {loading ? '...' : `${count} examen${count > 1 ? 's' : ''} créé${count > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Mascot gif — same size as Chapters home */}
        <div className="flex-shrink-0 flex justify-center mb-4">
          <img
            src="/gifbrophoto_transparent.gif"
            alt="Numio"
            style={{ width: '100%', maxWidth: 360, height: 'auto', mixBlendMode: 'multiply' }}
          />
        </div>

        {/* Prendre une photo */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-full flex items-center justify-center gap-3 rounded-full active:scale-95 transition-all mb-8"
          style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '16px 20px' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="9" cy="9" r="1.8" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="font-display font-extrabold text-base text-ink">Prendre une photo</span>
        </button>

        {/* Réviser */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-ink">Réviser</h2>
            {!loading && count > 0 && (
              <button
                onClick={() => onRevision(chapter, exams)}
                className="font-body text-base active:opacity-60"
                style={{ color: '#4b5563' }}
              >
                Tout voir
              </button>
            )}
          </div>

          {!loading && count === 0 && (
            <p className="font-body text-sm text-center py-6" style={{ color: '#9ca3af' }}>
              Aucun examen pour le moment. Prends une photo pour commencer !
            </p>
          )}

          {!loading && count > 0 && (
            <div
              className="no-scrollbar flex gap-3 overflow-x-auto pb-2"
              style={{ scrollSnapType: 'x mandatory', marginRight: -20, paddingRight: 20 }}
            >
              {exams.map((exam, i) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  index={i}
                  single={count === 1}
                  onClick={() => onSelectExam?.(exam)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        key={`pick-${inputKey}`}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFilesPicked}
      />

      <style>{`.no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

function ExamCard({ exam, index, single, onClick }) {
  const n = exam.questions?.length ?? 0
  const date = new Date(exam.created_at).toLocaleDateString('fr', { day: 'numeric', month: 'short' })

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 text-left bg-white active:scale-95 transition-all"
      style={{
        flexShrink: 0,
        width: single ? '100%' : '82%',
        padding: 14,
        borderRadius: 28,
        border: '1.5px solid #eef0f3',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        scrollSnapAlign: 'start',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 56, height: 56, borderRadius: 18, background: ACCENTS[index % ACCENTS.length], fontSize: 28 }}
      >
        📝
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-extrabold text-base text-ink truncate">{exam.topic}</p>
        <p className="font-body text-sm truncate" style={{ color: '#6b7280' }}>
          {n} question{n > 1 ? 's' : ''} · {date}
        </p>
      </div>
    </button>
  )
}
