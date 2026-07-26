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

export default function Home({ chapter, onExamReady, onBack, kidId }) {
  const lang = useLang()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [status, setStatus]   = useState('idle') // idle | review | loading | error
  const [error, setError]     = useState(null)
  const [images, setImages]   = useState([]) // array of { file, preview }
  const [inputKey, setInputKey] = useState(0)

  const MAX_IMAGES = 5
  const MAX_SIZE_MB = 10

  // Called when user picks image(s) from gallery (multi-select)
  async function handleGallerySelected(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Count limit
    if (images.length + files.length > MAX_IMAGES) {
      setError(lang === 'ar' ? `الحد الأقصى ${MAX_IMAGES} صور` : `Max ${MAX_IMAGES} images allowed`)
      setStatus('error')
      return
    }

    // Size limit
    const tooBig = files.find(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(lang === 'ar' ? `حجم الصورة كبير جداً (الحد ${MAX_SIZE_MB}MB)` : `Image too large (max ${MAX_SIZE_MB}MB each)`)
      setStatus('error')
      return
    }

    const newImages = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setImages(prev => [...prev, ...newImages])
    setStatus('review')
  }

  // Called when user takes a photo with camera
  async function handleCameraSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (images.length >= MAX_IMAGES) {
      setError(lang === 'ar' ? `الحد الأقصى ${MAX_IMAGES} صور` : `Max ${MAX_IMAGES} images allowed`)
      setStatus('error')
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(lang === 'ar' ? `حجم الصورة كبير جداً (الحد ${MAX_SIZE_MB}MB)` : `Image too large (max ${MAX_SIZE_MB}MB each)`)
      setStatus('error')
      return
    }

    setImages(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
    setStatus('review')
    setInputKey(k => k + 1)
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
      // Compress all images before sending
      const compressed = await Promise.all(images.map(img => compressImage(img.file)))
      const exam = await generateExam(compressed)
      onExamReady(exam)
      saveExam({ chapterId: chapter.id, topic: exam.topic, questions: exam.questions, kidId })
        .catch(err => console.error('Failed to save exam:', err))
    } catch (err) {
      setError(err.message)
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

          {/* IDLE or REVIEW state */}
          {(status === 'idle' || status === 'review') && (
            <>
              {/* Add more pages buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setInputKey(k => k + 1); setTimeout(() => cameraInputRef.current?.click(), 10) }}
                  className="w-full bg-white border-2 border-gray-200 text-ink font-display font-bold text-base rounded-2xl py-4 transition-all active:translate-y-0.5 flex flex-col items-center gap-1"
                  style={{ boxShadow: '0 3px 0 #e5e7eb' }}
                >
                  <span style={{ fontSize: 28 }}>📷</span>
                  {lang === 'ar' ? 'التقط صورة' : 'Take photo'}
                </button>
                <button
                  onClick={() => { setInputKey(k => k + 1); setTimeout(() => fileInputRef.current?.click(), 10) }}
                  className="w-full bg-white border-2 border-gray-200 text-ink font-display font-bold text-base rounded-2xl py-4 transition-all active:translate-y-0.5 flex flex-col items-center gap-1"
                  style={{ boxShadow: '0 3px 0 #e5e7eb' }}
                >
                  <span style={{ fontSize: 28 }}>🖼️</span>
                  {lang === 'ar' ? 'اختر من المعرض' : 'Choose from gallery'}
                </button>
              </div>

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

          {/* LOADING */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
              <p className="font-display font-bold text-lg text-ink">{t(lang, 'home_generating')}</p>
              <p className="text-muted text-sm">{t(lang, 'home_reading')}</p>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="w-full flex flex-col gap-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="font-display font-bold text-xl text-duo-red">{t(lang, 'home_error_title')}</p>
                <p className="text-sm text-muted mt-2">
                  {lang === 'ar' ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-duo text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:translate-y-1"
                style={{ boxShadow: '0 4px 0 #46a302' }}
              >
                {t(lang, 'home_try_again')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Camera input */}
      <input
        key={`cam-${inputKey}`}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraSelected}
      />

      {/* Gallery input — multiple */}
      <input
        key={`gal-${inputKey}`}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGallerySelected}
      />
    </div>
  )
}
