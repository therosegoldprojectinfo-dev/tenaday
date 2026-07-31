import { useState, useRef } from 'react'
import { generateExam } from '../lib/generateExam'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'

function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

const strings = {
  en: {
    welcome_title: 'Welcome to Numio 🌸',
    welcome_desc: "Take a photo of today's homework or lesson, and Numio will turn it into a fun challenge.",
    cta: '📸 Create my first challenge',
    skip: 'Skip for now',
    loading_title: '✨ Turning your lesson into a challenge...',
    loading_desc: 'Numio is creating a fun way for your child to practice.',
    error_title: 'Something went wrong',
    retry: 'Try again',
    ready_title: '🎉 Your challenge is ready!',
    ready_desc: 'Your child is ready to start practicing.',
    start: '🚀 Start challenge',
  },
  ar: {
    welcome_title: 'مرحباً بك في Numio 🌸',
    welcome_desc: 'التقط صورة لواجب اليوم أو الدرس، وسيحوّله Numio إلى تحدٍّ ممتع.',
    cta: '📸 أنشئ تحديّي الأول',
    skip: 'تخطي الآن',
    loading_title: '✨ نحوّل درسك إلى تحدٍّ...',
    loading_desc: 'يُنشئ Numio طريقة ممتعة لطفلك للتدرّب.',
    error_title: 'حدث خطأ ما',
    retry: 'حاول مرة أخرى',
    ready_title: '🎉 تحدّيك جاهز!',
    ready_desc: 'طفلك جاهز للبدء في الممارسة.',
    start: '🚀 ابدأ التحدّي',
  },
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

async function saveActivationExam(exam, kidId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: chapter, error: chErr } = await supabase
    .from('chapters')
    .insert({ name: 'First Challenge', emoji: '📸', user_id: user.id, kid_id: kidId, is_activation: true })
    .select()
    .single()
  if (chErr) throw chErr

  const { data, error } = await supabase
    .from('exams')
    .insert({ user_id: user.id, kid_id: kidId, topic: exam.topic, questions: exam.questions, chapter_id: chapter.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export default function Activation({ onComplete, onSkip, kidId }) {
  const lang = useLang()
  const s = strings[lang] || strings.en
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const [status, setStatus] = useState('welcome')
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
      const savedExam = await saveActivationExam(result, kidId)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('test_quizzes').insert({ user_id: user.id, exam_data: result, created_at: new Date().toISOString() })
      } catch (e) { console.error('test_quiz save failed:', e) }
      firePixel('trackCustom', 'ChallengeGenerated')
      fireGtag('challenge_generated')
      setExam(savedExam)
      setStatus('ready')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
      setStatus('error')
    }
  }

  if (status === 'welcome') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }} dir={dir}>
        <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
        <div>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">{s.welcome_title}</h1>
          <p className="font-body text-base text-muted leading-relaxed">{s.welcome_desc}</p>
        </div>
        <button onClick={() => { firePixel('trackCustom', 'FirstChallengeStarted'); fireGtag('first_challenge_started'); inputRef.current?.click() }}
          className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
          style={{ boxShadow: '0 4px 0 #46a302' }}>
          {s.cta}
        </button>
        <button onClick={onSkip} className="font-body font-bold text-sm text-muted py-2">{s.skip}</button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }} dir={dir}>
        <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
        <div>
          <h2 className="font-display font-extrabold text-2xl text-ink mb-2">{s.loading_title}</h2>
          <p className="font-body text-base text-muted">{s.loading_desc}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-6" style={{ height: '100dvh' }} dir={dir}>
        <span style={{ fontSize: 64 }}>😅</span>
        <div>
          <h2 className="font-display font-extrabold text-2xl text-ink mb-2">{s.error_title}</h2>
          <p className="font-body text-base text-muted">{errorMsg}</p>
        </div>
        <button onClick={() => { setStatus('welcome'); setErrorMsg('') }}
          className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5"
          style={{ boxShadow: '0 4px 0 #46a302' }}>
          {s.retry}
        </button>
        <button onClick={onSkip} className="font-body font-bold text-sm text-muted py-2">{s.skip}</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center gap-8" style={{ height: '100dvh' }} dir={dir}>
      <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
      <div>
        <h2 className="font-display font-extrabold text-3xl text-ink mb-2">{s.ready_title}</h2>
        <p className="font-body text-base text-muted">{s.ready_desc}</p>
      </div>
      <button onClick={() => { firePixel('trackCustom', 'ChallengeStarted'); fireGtag('challenge_started'); onComplete(exam) }}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.start}
      </button>
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  )
}
