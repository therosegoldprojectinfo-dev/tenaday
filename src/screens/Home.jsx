import { useRef, useState } from 'react'
import { generatePractice } from '../lib/generatePractice'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

async function compressImage(file, maxWidthPx = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    img.src = url
  })
}

function getErrorMessage(err, lang) {
  if (err?.message === 'RATE_LIMIT') {
    return lang === 'ar'
      ? 'لقد وصلت إلى الحد اليومي للاختبارات. حاول مجدداً غداً. 🌙'
      : "You've reached today's quiz limit. Try again tomorrow. 🌙"
  }
  if (err?.message === 'DAILY_LIMIT' || err?.message?.includes('temporarily unavailable')) {
    return lang === 'ar' ? 'وصلنا للحد اليومي. عد غداً 🌙' : 'Daily limit reached. Come back tomorrow 🌙'
  }
  if (err?.message === 'SUBSCRIPTION_ACTIVATING' || err?.message === 'SUBSCRIPTION_REQUIRED') {
    return lang === 'ar'
      ? '⏳ جاري تفعيل اشتراكك، انتظر لحظة ثم حاول مجدداً.'
      : '⏳ Your subscription is activating. Wait a moment and try again.'
  }
  if (err?.message) return err.message
  return lang === 'ar' ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'
}

export default function Home({ chapter, onExamReady, onBack, kidId, initialFiles }) {
  const lang = useLang()
  const cameraInputRef = useRef(null)
  const MAX_SIZE_MB = 10

  function validateFile(file) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return new Error(lang === 'ar' ? `حجم الصورة كبير جداً (الحد ${MAX_SIZE_MB}MB)` : `Image too large (max ${MAX_SIZE_MB}MB)`)
    }
    return null
  }

  const startFile  = Array.isArray(initialFiles) ? initialFiles[0] : null
  const startError = startFile ? validateFile(startFile) : null

  const [status, setStatus] = useState(startError ? 'error' : startFile ? 'review' : 'idle')
  const [error, setError]   = useState(startError)
  const [image, setImage]   = useState(() =>
    startFile && !startError ? { file: startFile, preview: URL.createObjectURL(startFile) } : null
  )
  const [inputKey, setInputKey] = useState(0)

  function handleRetake(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const problem = validateFile(file)
    if (problem) {
      setError(problem)
      setStatus('error')
      return
    }
    if (image?.preview) URL.revokeObjectURL(image.preview)
    setImage({ file, preview: URL.createObjectURL(file) })
    setStatus('review')
  }

  function handleReset() {
    setError(null)
    setImage(null)
    setInputKey(k => k + 1)
    onBack()
  }

  async function handleGenerate() {
    if (!image) return
    setStatus('loading')
    setError(null)
    try {
      const compressed = [await compressImage(image.file)]
      const saved = await generatePractice(compressed, { kidId, chapterId: chapter.id })
      onExamReady(saved)
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const isRateLimit = error?.message === 'RATE_LIMIT' || error?.message === 'DAILY_LIMIT' || error?.message?.includes('temporarily unavailable')

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>

        {/* Back */}
        <button
          onClick={onBack}
          className="flex-shrink-0 text-muted font-body font-bold text-sm mt-12 mb-2 flex items-center gap-1 active:opacity-60 self-start"
        >
          {t(lang, 'home_back')}
        </button>

        {/* Chapter title */}
        <div className="flex-shrink-0 flex items-center gap-3 mb-6">
          <span style={{ fontSize: 32 }}>{chapter.emoji}</span>
          <h1 className="font-display font-extrabold text-2xl text-ink">{chapter.name}</h1>
        </div>

        {/* REVIEW */}
        {status === 'review' && image && (
          <div className="flex-1 flex flex-col items-center gap-5 pb-10">
            <div
              className="w-full flex items-center justify-center overflow-hidden"
              style={{ borderRadius: 28, background: '#f9fafb', border: '1.5px solid #eef0f3', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <img
                src={image.preview}
                alt="Photo"
                style={{ width: '100%', maxHeight: '46dvh', objectFit: 'contain' }}
              />
            </div>

            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2.5 text-white font-display font-bold text-lg rounded-2xl py-5 transition-all active:scale-95"
              style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
                <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
              </svg>
              Générer le quiz
            </button>

            <button
              onClick={() => { setInputKey(k => k + 1); setTimeout(() => cameraInputRef.current?.click(), 10) }}
              className="w-full flex items-center justify-center gap-2.5 font-display font-bold text-base text-ink rounded-2xl py-4 transition-all active:scale-95"
              style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Reprendre la photo
            </button>
          </div>
        )}

        {/* LOADING */}
        {status === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-10">
            <p
              className="font-display font-bold text-muted"
              style={{ fontSize: '1rem', letterSpacing: '0.04em' }}
            >
              Quiz
            </p>

            {/* Curved "Chargement" */}
            <svg viewBox="0 0 400 120" width="340" height="110" style={{ overflow: 'visible' }}>
              <defs>
                <path id="curve" d="M 30,90 Q 200,30 370,90" />
              </defs>
              <text
                fontFamily="inherit"
                fontWeight="800"
                fontSize="62"
                fill="#1a1a2e"
              >
                <textPath href="#curve" startOffset="50%" textAnchor="middle">
                  Chargement
                </textPath>
              </text>
            </svg>

            {/* 3 bouncing dots */}
            <div className="flex items-center gap-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#7c3aed',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-10 px-4">
            <span style={{ fontSize: 64 }}>😅</span>
            <div className="text-center">
              <p className="font-display font-bold text-xl text-ink">{t(lang, 'home_error_title')}</p>
              <p className="text-sm text-muted mt-2">{getErrorMessage(error, lang)}</p>
            </div>
            {!isRateLimit && (
              <button
                onClick={handleReset}
                className="w-full text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
                style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}
              >
                {t(lang, 'home_try_again')}
              </button>
            )}
            {isRateLimit && (
              <button onClick={handleReset} className="w-full bg-gray-100 text-muted font-display font-bold text-base rounded-2xl py-4">
                {lang === 'ar' ? 'رجوع' : 'Go back'}
              </button>
            )}
          </div>
        )}
      </div>

      <input
        key={`cam-${inputKey}`}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleRetake}
      />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-12px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
