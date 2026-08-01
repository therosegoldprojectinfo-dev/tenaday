import { useState, useMemo } from 'react'
import { completeQuiz, updateStreak } from '../lib/economy'
import StreakPopup from './StreakPopup'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const COINS_PER_QUESTION = 2

// ── Coin icon ─────────────────────────────────────────────────────
function CoinIcon({ size = 28 }) {
  return <img src="/coin.png" width={size} height={size} alt="coin" style={{ objectFit: 'contain' }} />
}

// ── Quit popup ────────────────────────────────────────────────────
function QuitPopup({ visible, onStay, onLeave }) {
  const lang = useLang()
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      background: 'rgba(255,255,255,0.92)',
    }}>
      <div style={{
        background: 'white', borderRadius: 24,
        border: '2px solid #e5e7eb', padding: '20px 24px',
        maxWidth: 320, width: '90%', marginBottom: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
      }}>
        <p style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 18,
          color: '#3c3c3c', textAlign: 'center', lineHeight: 1.4, margin: 0,
        }}>
          {t(lang, 'quiz_quit_title')}<br />{t(lang, 'quiz_quit_sub')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button onClick={onStay} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '14px 0', borderRadius: 14,
            background: '#58cc02', boxShadow: '0 4px 0 #46a302',
            color: '#fff', fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>{t(lang, 'quiz_quit_stay')}</button>
          <button onClick={onLeave} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '12px 0', borderRadius: 14,
            background: 'none', color: '#9ca3af',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14,
          }}>{t(lang, 'quiz_quit_leave')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Results screen ────────────────────────────────────────────────
function ResultsScreen({ questions, answers, topic, onDone, coinsEarned, isTrial = false, isReplay = false }) {
  const lang = useLang()
  const correct = questions.filter((q, i) => {
    const a = answers[i]
    return answersMatch(a, q.correct_answer)
  }).length
  const total   = questions.length
  const wrong   = questions.filter((q, i) => !answersMatch(answers[i], q.correct_answer))
  const pct = Math.round((correct / total) * 100)

  let emoji, headlineKey, subKey
  if (pct === 100) {
    emoji = '🏆'; headlineKey = 'quiz_results_perfect'; subKey = 'quiz_results_perfect_sub'
  } else if (pct >= 80) {
    emoji = '🎉'; headlineKey = 'quiz_results_great'; subKey = 'quiz_results_great_sub'
  } else if (pct >= 60) {
    emoji = '😊'; headlineKey = 'quiz_results_good'; subKey = 'quiz_results_good_sub'
  } else {
    emoji = '💪'; headlineKey = 'quiz_results_keep'; subKey = 'quiz_results_keep_sub'
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-10 gap-5" style={{ height: '100dvh', overflowY: 'auto' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-5">

        {/* Mascot */}
        <div style={{ animation: 'mascot-float 2s ease-in-out infinite' }}>
          <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
        </div>

        {/* Headline */}
        <div className="text-center">
          <p style={{ fontSize: 48 }}>{emoji}</p>
          <h2 className="font-display font-extrabold text-3xl text-ink mt-1">{t(lang, headlineKey)}</h2>
          <p className="font-body text-base text-muted mt-1">{t(lang, subKey)}</p>
        </div>

        {/* Score / Coins */}
        {isTrial ? (
          <div className="flex items-center gap-4 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 w-full">
            <span style={{ fontSize: 40 }}>🎯</span>
            <div>
              <p className="font-body text-xs text-green-600 font-bold uppercase tracking-widest">
                {lang === 'ar' ? 'نتيجتك' : 'Your score'}
              </p>
              <p className="font-display font-extrabold text-3xl text-green-600">{correct}/{total}</p>
            </div>
          </div>
        ) : coinsEarned > 0 ? (
          <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4">
            <CoinIcon size={40} />
            <div>
              <p className="font-body text-xs text-amber-600 font-bold uppercase tracking-widest">{t(lang, 'quiz_results_coins')}</p>
              <p className="font-display font-extrabold text-3xl text-amber-500">+{coinsEarned}</p>
            </div>
          </div>
        ) : isReplay ? (
          <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-center">
            <p className="font-display font-bold text-base text-muted">
              {lang === 'ar' ? '✅ لقد أكملت هذا التحدي من قبل' : '✅ You already completed this quiz'}
            </p>
            <p className="font-body text-xs text-muted mt-1">
              {lang === 'ar' ? 'العملات تُمنح مرة واحدة فقط لكل تحدٍّ' : 'Coins are awarded once per quiz'}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 w-full">
            <span style={{ fontSize: 40 }}>🎯</span>
            <div>
              <p className="font-body text-xs text-green-600 font-bold uppercase tracking-widest">
                {lang === 'ar' ? 'نتيجتك' : 'Your score'}
              </p>
              <p className="font-display font-extrabold text-3xl text-green-600">{correct}/{total}</p>
            </div>
          </div>
        )}

        <button
          onClick={onDone}
          className="w-full bg-duo active:bg-duo-dark text-white font-display font-bold text-xl rounded-2xl py-5 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all"
        >
          {t(lang, 'quiz_results_continue')}
        </button>
      </div>

      <style>{`
        @keyframes mascot-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

// ── True/False options per language ──────────────────────────────
function getTrueFalseOptions(correctAnswer) {
  const a = (correctAnswer || '').toLowerCase()
  if (a === 'vrai' || a === 'faux')           return ['Vrai', 'Faux']
  if (a === 'صحيح' || a === 'خطأ')            return ['صحيح', 'خطأ']
  if (a === 'verdadero' || a === 'falso')     return ['Verdadero', 'Falso']
  if (a === 'wahr' || a === 'falsch')         return ['Wahr', 'Falsch']
  if (a === 'vero' || a === 'falso')          return ['Vero', 'Falso']
  return ['True', 'False'] // default English
}

// ── Normalize helper ──────────────────────────────────────────────
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064a')
    .replace(/^\u0627\u0644/, '')
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/^(les|des|un|une|le|la|l'|the|a|an)\s+/i, '')
    .trim()
}

// Plural tolerance for Latin-script only — Arabic/French science vocab not mangled
function answersMatch(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return true
  const isLatin = s => /^[\x20-\x7E]+$/.test(s)
  if (isLatin(na) && isLatin(nb)) return na.replace(/s$/, '') === nb.replace(/s$/, '')
  return false
}

// ── MCQ Card ──────────────────────────────────────────────────────
function MCQCard({ option, selected, revealed, correct, onSelect, big }) {
  const isSelected = selected === option
  const isCorrect  = option === correct

  let borderColor = 'border-gray-200'
  let bgColor     = 'bg-white'
  let textColor   = 'text-ink'

  if (revealed) {
    if (isCorrect)              { borderColor = 'border-green-400'; bgColor = 'bg-green-50'; textColor = 'text-green-700' }
    else if (isSelected)        { borderColor = 'border-red-300';   bgColor = 'bg-red-50';   textColor = 'text-red-500' }
    else                        { borderColor = 'border-gray-100';  textColor = 'text-gray-300' }
  } else if (isSelected)        { borderColor = 'border-blue-400'; bgColor = 'bg-blue-50'; textColor = 'text-blue-700' }

  return (
    <button
      disabled={revealed}
      onClick={() => onSelect(option)}
      className={`w-full rounded-2xl border-2 font-display font-bold transition-all active:scale-[0.97] select-none
        ${big ? 'text-3xl h-28 flex items-center justify-center' : 'text-lg px-5 py-4 text-left'}
        ${borderColor} ${bgColor} ${textColor}`}
    >
      {option}
    </button>
  )
}

// ── X Icon ────────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

// ── Main Quiz ─────────────────────────────────────────────────────

// ── Fire Mode Overlay ─────────────────────────────────────────────
function FireModeOverlay({ streakKey, consecutiveCorrect }) {
  const fireCount = Math.min(6 + consecutiveCorrect * 3, 30)
  const headCount = Math.min(2 + consecutiveCorrect * 2, 15)

  const { fires, heads } = useMemo(() => ({
    fires: Array.from({ length: fireCount }, () => ({
      left:     Math.random() * 100,
      delay:    (Math.random() * 0.5).toFixed(2),
      duration: (0.8 + Math.random() * 0.8).toFixed(2),
      size:     28 + Math.random() * 32,
    })),
    heads: Array.from({ length: headCount }, () => ({
      left:     Math.random() * 95,
      delay:    (Math.random() * 0.6).toFixed(2),
      duration: (0.9 + Math.random() * 1.0).toFixed(2),
      size:     50 + Math.random() * 60,
      rotate:   ((Math.random() - 0.5) * 60).toFixed(1),
    })),
  }), [streakKey, fireCount, headCount])

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden" key={streakKey}>
      {fires.map((p, i) => (
        <div key={`fire-${i}`} style={{
          position: 'absolute', bottom: -80, left: `${p.left}%`,
          fontSize: p.size, opacity: 0,
          animation: `fire-rise ${p.duration}s ${p.delay}s ease-out both`,
        }}>🔥</div>
      ))}
      {heads.map((p, i) => (
        <div key={`head-${i}`} style={{
          position: 'absolute', bottom: -100, left: `${p.left}%`,
          width: p.size, height: p.size, opacity: 0,
          transform: `rotate(${p.rotate}deg)`,
          animation: `fire-rise ${p.duration}s ${p.delay}s ease-out both`,
        }}>
          <img src="/mascot.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ))}
      <style>{`
        @keyframes fire-rise {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 0.9; }
          100% { transform: translateY(-110vh) rotate(180deg) scale(0.5); opacity: 0; }
        }
        .fire-particle { opacity: 0; }
      `}</style>
    </div>
  )
}

export default function Quiz({ exam, onDone, kidId, isTrial = false }) {
  const lang = useLang()
  const questions = exam.questions || []
  const topic     = exam.topic || 'Quiz'

  const [idx,         setIdx]         = useState(0)
  const [selected,    setSelected]    = useState(null)
  const [revealed,    setRevealed]    = useState(false)
  const [answers,     setAnswers]     = useState([])
  const [showQuit,    setShowQuit]    = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showStreak,  setShowStreak]  = useState(false)
  const [streakCount, setStreakCount] = useState(0)
  const [typedValue,  setTypedValue]  = useState('')
  const [saving,      setSaving]      = useState(false)

  const q             = questions[idx]
  const total         = questions.length
  const progressScale = (idx + (revealed ? 1 : 0)) / Math.max(total, 1)

  function checkCorrect(answer) {
    return answersMatch(answer, q?.correct_answer)
  }

  const isCorrect = revealed && checkCorrect(q?.type === 'fill_blank' ? typedValue : selected)

  const [coinSaveError, setCoinSaveError] = useState(false)
  const [coinsEarned,  setCoinsEarned]  = useState(0)
  const [isReplay,     setIsReplay]     = useState(false) // true when quiz was already completed
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0)
  const [fireKey, setFireKey] = useState(0)

  const onFire = consecutiveCorrect >= 2

  async function handleContinue() {
    const answer    = q.type === 'fill_blank' ? typedValue : selected
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    if (idx === total - 1) {
      // Last question — in trial mode show results but skip coin/streak RPCs
      if (isTrial) {
        setShowResults(true)
        return
      }

      // Award coins + update streak, then show results
      setSaving(true)
      setCoinSaveError(false)
      try {
        const correctCount = questions.filter((q, i) => {
          const a = i === idx ? answer : answers[i]
          return answersMatch(a, q.correct_answer)
        }).length
        const wrongIds = questions
          .map((q, i) => ({ q, a: i === idx ? answer : answers[i] }))
          .filter(({ q, a }) => !answersMatch(a, q.correct_answer))
          .map(({ q }) => q.id)
        const { coinsAwarded } = await completeQuiz(exam.id, kidId, {
          correct: correctCount,
          total,
          wrongIds,
        })
        setCoinsEarned(coinsAwarded)
        if (coinsAwarded === 0) setIsReplay(true)
        const { streakCount: sc, isNewDay } = await updateStreak(kidId)
        if (isNewDay) {
          setStreakCount(sc)
          setShowStreak(true)
        } else {
          setShowResults(true)
        }
      } catch (e) {
        console.error('End of quiz error:', e)
        setCoinSaveError(true)
        setSaving(false)
      }
      setSaving(false)
      return
    }

    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTypedValue('')
  }

  function handleCheck() {
    const answer = q.type === 'fill_blank' ? typedValue : selected
    if (!answer && answer !== false) return
    setSelected(q.type === 'fill_blank' ? typedValue : selected)
    setRevealed(true)
    // Trigger fire burst at reveal time, not at continue
    if (checkCorrect(answer)) {
      setConsecutiveCorrect(c => {
        const next = c + 1
        if (next >= 2) setFireKey(k => k + 1)
        return next
      })
    } else {
      setConsecutiveCorrect(0)
    }
  }

  if (showStreak) {
    return (
      <StreakPopup
        streakCount={streakCount}
        onClose={() => { setShowStreak(false); setShowResults(true) }}
      />
    )
  }

  if (coinSaveError) {
    return (
      <div className="flex items-center justify-center bg-white" style={{ height: '100dvh' }}>
        <div className="flex flex-col items-center gap-6 px-8 max-w-sm text-center">
          <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
          <p className="font-display font-bold text-xl text-ink">
            {lang === 'ar' ? 'تعذّر حفظ عملاتك 😅' : "Couldn't save your coins 😅"}
          </p>
          <p className="font-body text-sm text-muted">
            {lang === 'ar' ? 'تحقق من اتصالك بالإنترنت وحاول مجدداً' : 'Check your connection and try again'}
          </p>
          <button
            onClick={async () => {
              setCoinSaveError(false)
              setSaving(true)
              try {
                const correctCount = questions.filter((q, i) => answersMatch(answers[i], q.correct_answer)).length; const wrongIds = questions.filter((q, i) => !answersMatch(answers[i], q.correct_answer)).map(q => q.id); const { coinsAwarded } = await completeQuiz(exam.id, kidId, { correct: correctCount, total, wrongIds })
                setCoinsEarned(coinsAwarded)
                if (coinsAwarded === 0) setIsReplay(true)
                const { streakCount: sc, isNewDay } = await updateStreak(kidId)
                if (isNewDay) { setStreakCount(sc); setShowStreak(true) }
                else setShowResults(true)
              } catch { setCoinSaveError(true) }
              setSaving(false)
            }}
            className="w-full bg-duo text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}
          >
            {lang === 'ar' ? 'حاول مجدداً' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }

  if (showResults) {
    return (
      <ResultsScreen
        questions={questions}
        answers={answers}
        topic={topic}
        onDone={onDone}
        coinsEarned={coinsEarned} isTrial={isTrial} isReplay={isReplay}
      />
    )
  }

  if (!q) return null

  return (
    <div className="flex items-center justify-center bg-white" style={{ height: '100dvh', overflow: 'hidden' }}>
      <QuitPopup
        visible={showQuit}
        onStay={() => setShowQuit(false)}
        onLeave={onDone}
      />

      {onFire && <FireModeOverlay streakKey={fireKey} consecutiveCorrect={consecutiveCorrect} />}

      <div className="flex flex-col bg-white w-full max-w-sm" style={{ height: '100dvh' }}>

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-2 pb-1">
          <button onClick={() => setShowQuit(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-300 active:bg-gray-100">
            <XIcon />
          </button>
          <div className="flex-1 h-5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full origin-left"
              style={{
                transform: `scaleX(${progressScale})`,
                transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)',
                background: onFire ? 'linear-gradient(90deg, #ff4b4b, #ff9600)' : '#58cc02',
              }} />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-sm text-muted">{idx + 1}/{total}</span>
          </div>
        </div>

        {/* Topic */}
        <div className="flex-shrink-0 px-5 pt-2 pb-1">
          <p className="font-body font-bold text-xs tracking-widest uppercase text-duo truncate">{topic}</p>
        </div>

        {/* Question — capped height, scrollable if too long */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3" style={{ maxHeight: '30%', overflowY: 'auto' }}>
          <p className="font-display font-bold text-2xl text-ink leading-snug">{q.question}</p>
        </div>

        {/* Answers — flex-1 so it fills remaining space */}
        <div className="px-4 mt-2 flex-1 overflow-y-auto">
          {q.type === 'mcq' && (
            <div className="flex flex-col gap-3">
              {q.options.map(option => (
                <MCQCard key={option} option={option} selected={selected}
                  revealed={revealed} correct={q.correct_answer} onSelect={setSelected} />
              ))}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {getTrueFalseOptions(q.correct_answer).map(option => (
                <MCQCard key={option} option={option} selected={selected}
                  revealed={revealed} correct={q.correct_answer} onSelect={setSelected} big />
              ))}
            </div>
          )}

          {q.type === 'fill_blank' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={typedValue}
                onChange={e => setTypedValue(e.target.value)}
                disabled={revealed}
                placeholder={t(lang, 'quiz_fill_placeholder')}
                className={`w-full border-2 rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none transition-colors ${
                  revealed
                    ? checkCorrect(typedValue) ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'
                    : 'border-gray-200 focus:border-duo'
                }`}
              />
              {revealed && !checkCorrect(typedValue) && (
                <p className="font-body text-sm text-duo font-bold px-1">
                  {t(lang, 'quiz_correct_answer', q.correct_answer)}
                </p>
              )}
            </div>
          )}

          {/* Explanation */}
          {revealed && q.explanation && (
            <div className="mt-4 bg-blue-50 border-2 border-blue-100 rounded-2xl px-4 py-3">
              <p className="font-body text-sm text-blue-700 leading-snug">💡 {q.explanation}</p>
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div className="flex-shrink-0 px-4 pt-2 pb-6">
          {!revealed ? (
            <button
              disabled={q.type === 'fill_blank' ? typedValue.trim() === '' : selected === null}
              onClick={handleCheck}
              className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all tracking-widest active:translate-y-1"
              style={{ boxShadow: '0 4px 0 #46a302' }}
            >
              {t(lang, 'quiz_check')}
            </button>
          ) : (
            <div className={`rounded-2xl overflow-hidden border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{isCorrect ? '🎉' : '💪'}</span>
                <p className="font-display font-bold text-lg text-ink">
                  {isCorrect ? t(lang, 'quiz_correct') : t(lang, 'quiz_not_quite')}
                </p>
              </div>
              <button
                onClick={handleContinue}
                disabled={saving}
                className={`w-full py-4 font-display font-bold text-xl tracking-widest text-white active:translate-y-0.5 transition-all ${isCorrect ? 'bg-duo' : 'bg-amber-400'}`}
                style={{ boxShadow: isCorrect ? '0 4px 0 #46a302' : '0 4px 0 #d97706' }}
              >
                {saving ? t(lang, 'quiz_saving') : t(lang, 'quiz_continue')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
