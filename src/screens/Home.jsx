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

export default function Home({ chapter, onExamReady, onBack, kidId }) {
  const lang = useLang()
  const cameraInputRef = useRef(null)
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState(null)
  const [images, setImages]   = useState([])
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
      const generated  = await generateExam(compressed)
      // Save with page_text so revision regeneration can use it later
      const saved = await saveExam({
        chapterId: chapter.id,
        topic:     generated.topic,
        questions: generated.questions,
        kidId,
        pageText:  generated.page_text || null,
      })
      onExamReady(saved)
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const isRateLimit = error?.message === 'RATE_LIMIT' || error?.message === 'DAILY_LIMIT' || error?.message?.includes('temporarily unavailable')

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1">

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

        {/* IDLE — hero camera UI */}
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 pb-10">
            {/* Mascot */}
            <div style={{ animation: 'float 3s ease-in-out infinite' }}>
              <img src="/nav-profile.png" alt="" className="w-36 h-auto" />
            </div>

            {/* Text */}
            <div className="text-center px-4">
              <p className="font-display font-extrabold text-2xl text-ink leading-snug">
                {lang === 'ar'
                  ? 'أعطني صورة وسأحوّلها إلى اختبار ممتع!'
                  : 'Give me a photo, I\'ll turn it into a fun quiz!'}
              </p>
            </div>

            {/* Big camera circle button */}
            <button
              onClick={() => { setInputKey(k => k + 1); setTimeout(() => cameraInputRef.current?.click(), 10) }}
              className="flex items-center justify-center transition-all active:scale-95"
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                background: '#7c3aed',
                boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <p className="font-body text-sm text-muted">
              {lang === 'ar' ? 'اضغط للتقاط صورة أو اختيار من معرضك' : 'Tap to take a photo or choose from gallery'}
            </p>
          </div>
        )}

        {/* REVIEW — images added, ready to generate */}
        {status === 'review' && (
          <div className="flex-1 flex flex-col gap-5 pb-10">
            {/* Image previews */}
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden border-2 border-gray-100" style={{ width: 90, height: 90 }}>
                  <img src={img.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold"
                  >×</button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs font-bold rounded px-1">{i + 1}</div>
                </div>
              ))}

              {/* Add more */}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => { setInputKey(k => k + 1); setTimeout(() => cameraInputRef.current?.click(), 10) }}
                  className="rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-muted text-2xl transition-all active:bg-gray-50"
                  style={{ width: 90, height: 90 }}
                >+</button>
              )}
            </div>

            <p className="font-body text-sm text-muted">
              {images.length} {lang === 'ar' ? 'صفحة مضافة' : `page${images.length > 1 ? 's' : ''} added`}
            </p>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              className="w-full text-white font-display font-bold text-lg rounded-2xl py-5 transition-all active:scale-95"
              style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
            >
              {lang === 'ar' ? '✨ توليد الاختبار' : '✨ Generate quiz'}
            </button>

            <button onClick={handleReset} className="w-full text-muted font-body font-bold text-sm py-2 text-center">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        )}

        {/* LOADING */}
        {status === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-10">
            <div style={{ animation: 'float 2s ease-in-out infinite' }}>
              <img src="/nav-profile.png" alt="" className="w-28 h-auto" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-xl text-ink">{t(lang, 'home_generating')}</p>
              <p className="text-muted text-sm mt-1">{t(lang, 'home_reading')}</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-violet-500 animate-spin" />
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
        multiple
        className="hidden"
        onChange={handleGallerySelected}
      />

      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
    </div>
  )
}
