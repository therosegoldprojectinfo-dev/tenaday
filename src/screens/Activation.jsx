import { useState, useRef } from 'react'
import { generateExam } from '../lib/generateExam'
import { supabase } from '../lib/supabaseClient'

function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

async function compressImage(file, maxWidthPx = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    img.src = url
  })
}

async function saveTestQuiz(exam) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('test_quizzes').insert({
      user_id: user.id,
      exam_data: exam,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Failed to save test quiz:', e)
  }
}

export default function Activation({ onComplete, kidId }) {
  const [status, setStatus] = useState('welcome') // welcome | loading | ready | error
  const [exam, setExam]     = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef(null)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('loading')
    firePixel('trackCustom', 'LessonPhotoUploaded')
    fireGtag('lesson_photo_uploaded')

    try {
      const compressed = await compressImage(file)
      const result = await generateExam([compressed])

      // Save silently as test_quiz — not shown to user
      await saveTestQuiz(result)

      firePixel('trackCustom', 'ChallengeGenerated')
      fireGtag('challenge_generated')

      setExam(result)
      setStatus('ready')
    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // ── WELCOME ───────────────────────────────────────────────────────
  if (status === 'welcome') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }}>
        <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">Welcome to Numio 🌸</h1>
          <p className="font-body text-base text-muted leading-relaxed">
            Take a photo of today's homework or lesson, and Numio will turn it into a fun challenge.
          </p>
        </div>
        <button
          onClick={() => {
            firePixel('trackCustom', 'FirstChallengeStarted')
            fireGtag('first_challenge_started')
            inputRef.current?.click()
          }}
          className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
          style={{ boxShadow: '0 4px 0 #46a302' }}
        >
          📸 Create my first challenge
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }}>
        <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
        <div>
          <h2 className="font-display font-extrabold text-2xl text-ink mb-2">✨ Turning your lesson into a challenge...</h2>
          <p className="font-body text-base text-muted">Numio is creating a fun way for your child to practice.</p>
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-6" style={{ height: '100dvh' }}>
        <span style={{ fontSize: 64 }}>😅</span>
        <div>
          <h2 className="font-display font-extrabold text-2xl text-ink mb-2">Something went wrong</h2>
          <p className="font-body text-base text-muted">{errorMsg}</p>
        </div>
        <button
          onClick={() => { setStatus('welcome'); setErrorMsg('') }}
          className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5"
          style={{ boxShadow: '0 4px 0 #46a302' }}
        >
          Try again
        </button>
      </div>
    )
  }

  // ── READY ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }}>
      <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
      <div>
        <h2 className="font-display font-extrabold text-3xl text-ink mb-2">🎉 Your challenge is ready!</h2>
        <p className="font-body text-base text-muted">Your child is ready to start practicing.</p>
      </div>
      <button
        onClick={() => {
          firePixel('trackCustom', 'ChallengeStarted')
          fireGtag('challenge_started')
          onComplete(exam)
        }}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}
      >
        🚀 Start challenge
      </button>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
