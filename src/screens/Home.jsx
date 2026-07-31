import { useRef, useState } from 'react'
import { generateExam } from '../lib/generateExam'
import { saveExam } from '../lib/chapters'
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

// FIX #4: returns a bilingual rate-limit message when the error is RATE_LIMIT
function getErrorMessage(err, lang) {
  if (err?.message === 'RATE_LIMIT') {
    return lang === 'ar'
      ? 'لقد وصلت إلى الحد اليومي للاختبارات. حاول مجدداً غداً. 🌙'
      : "You've reached today's quiz limit. Try again tomorrow. 🌙"
  }
  return lang === 'ar' ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'
}

export default function Home({ chapter, onExamReady, onBack, kidId }) {
  const lang = useLang()
  const cameraInputRef = useRef(null)
  const [status, setStatus]   = useState('idle') // idle | review | loading | error
  const [error, setError]     = useState(null)
  const [images, setImages]   = useState([]) // array of { file, preview }
  const [inputKey, setInputKey] = useState(0)

  const MAX_IMAGES = 5
  const MAX_SIZE_MB = 10

  async function handleGallerySelected(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (images.length + files.length > MAX_IMAGES) {
      setError(new Error(lang === 'ar' ? `الحد الأقصى ${MAX_IMAGES} صور` : `Max ${MAX_IMAGES} images allowed`))
      setStatus('error')
      return
    }

    const tooBig = files.find(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(new Error(lang === 'ar' ? `حجم الصورة كبير جداً (الحد ${MAX_SIZE_MB}MB)` : `Image too large (max ${MAX_SIZE_MB}MB each)`))
      setStatus('error')
      return
    }

    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setImages(prev => [...prev, ...newImages])
    setStatus('review')
  }

  function removeImage(index) {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setStatus('idle')
      return next
    })
  }

  function handleReset() {
    setStatus('idle')
    setError(null)
    setImages([])
    setInputKey(k => k + 1)
  }

  async function handleGenerate() {
    if (!images.length) return
    setStatus('loading')
    setError(null)
    try {
      const compressed = await Promise.all(images.map(img => compressImage(img.file)))
      const generated = await generateExam(compressed)
      const saved = await saveExam({ chapterId: chapter.id, topic: generated.topic, questions: generated.questions, kidId })
      onExamReady(saved)
    } catch (err) {
      // FIX #4: store the raw error object so getErrorMessage can inspect it
      setError(err)
      setStatus('error')
    }
  }

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1">

        <button
          onClick={onBack}
          className="flex-shrink-0 text-muted font-body font-bold text-sm mt-12 mb-6 flex items-center gap-1 active:opacity-60 self-start"
        >
          {t(lang, 'home_back')}
        </button>

        <div className="flex-shrink-0 text-center mb-6">
          <span style={{ fontSize: 52 }}>{chapter.emoji}</span>
          <h1 className="font-display font-extrabold text-3xl text-ink tracking-tight mt-2">{chapter.name}</h1>
          <p className="mt-2 text-muted font-body text-base">{t(lang, 'home_snap')}</p>
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex-shrink-0 mb-4 flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden border-2 border-gray-100" style={{ width: 100, height: 100 }}>
                <img src={img.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold leading-none"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs font-bold rounded px-1">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center gap-3 pb-10">

          {(status === 'idle' || status === 'review') && (
            <>
              <button
                onClick={() => { setInputKey(k => k + 1); setTimeout(() => cameraInputRef.current?.click(), 10) }}
                className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-6 transition-all active:translate-y-1 flex flex-col items-center gap-2"
                style={{ boxShadow: '0 4px 0 #46a302' }}
              >
                <span style={{ fontSize: 36 }}>📸</span>
                {lang === 'ar' ? 'التقط صورة' : 'Take a photo'}
              </button>

              {images.length > 0 && (
                <>
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-muted font-body font-bold">
                      {images.length} {lang === 'ar' ? 'صفحة' : `page${images.length > 1 ? 's' : ''}`} {lang === 'ar' ? 'مضافة' : 'added'}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="w-full bg-duo text-white font-display font-bold text-lg rounded-2xl py-5 transition-all active:translate-y-1"
                    style={{ boxShadow: '0 4px 0 #46a302' }}
                  >
                    {lang === 'ar' ? '✨ توليد الاختبار' : '✨ Generate quiz'}
                  </button>
                </>
              )}
            </>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
              <p className="font-display font-bold text-lg text-ink">{t(lang, 'home_generating')}</p>
              <p className="text-muted text-sm">{t(lang, 'home_reading')}</p>
            </div>
          )}

          {/* FIX #4: error message now reads the error object and shows rate-limit copy when appropriate */}
          {status === 'error' && (
            <div className="w-full flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="font-display font-bold text-xl text-duo-red">{t(lang, 'home_error_title')}</p>
                <p className="text-sm text-muted mt-2">
                  {getErrorMessage(error, lang)}
                </p>
              </div>
              {/* Only show Try Again if it's not a rate limit — retrying won't help */}
              {error?.message !== 'RATE_LIMIT' && (
                <button
                  onClick={handleReset}
                  className="w-full bg-duo text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:translate-y-1"
                  style={{ boxShadow: '0 4px 0 #46a302' }}
                >
                  {t(lang, 'home_try_again')}
                </button>
              )}
              {error?.message === 'RATE_LIMIT' && (
                <button
                  onClick={handleReset}
                  className="w-full bg-gray-100 text-muted font-display font-bold text-base rounded-2xl py-4 transition-all active:translate-y-1"
                >
                  {lang === 'ar' ? 'رجوع' : 'Go back'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        key={`cam-${inputKey}`}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGallerySelected}
      />
    </div>
  )
}
