import { useState, useMemo, useRef, useEffect } from 'react'
import { completeQuiz, updateStreak } from '../lib/economy'
import { logQuestionAttempt } from '../lib/performance'
import { getAssetPath } from '../lib/openmojiAssets'
import { gradeAnswer } from '../lib/grading'
import StreakPopup from './StreakPopup'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const COINS_PER_QUESTION = 2

// ── Kid feedback: soft chime (no audio file needed) + short vibration ──
const SOUND_ON = true   // set to false to mute

let audioCtx
function feedbackSound(correct) {
  if (!SOUND_ON) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const notes = correct ? [523.25, 783.99] : [220]      // happy two-note chime / one soft low note
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = audioCtx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(start)
      osc.stop(start + 0.25)
    })
  } catch { /* sound is optional */ }
}

function buzz(correct) {
  try { navigator.vibrate?.(correct ? 25 : [30, 50, 30]) } catch { /* optional */ }
}

const FORGIVEN_WORDS = new Set([
  'the','a','an','and','or','but','of','in','on','at','to','for',
  'is','are','was','were','be','been','it','its',
  'le','la','les','un','une','des','et','ou','de','du','en','au','aux',
  'في','من','إلى','على','عن','مع','هو','هي','هم','هن',
])

function cleanQuestion(q) {
  if (!q) return q
  if (Array.isArray(q.items) && q.items.length > 0) {
    const cleaned = q.question
      .replace(/\s*[Ii]tems?:?\s*(\d+[.)]\s*.+?(?=\s+[Ww]hich|\s+[Ss]ort|\s+[Oo]rder|$))/gs, '')
      .replace(/\s*\d+[.)]\s*[^,.\n]+(,\s*\d+[.)]\s*[^,.\n]+)+\.?/g, '')
      .trim()
    return { ...q, question: cleaned }
  }

  const itemPattern = /\b1[.)]\s*(.+?)(?=\s*2[.)]\s*)/s
  if (!itemPattern.test(q.question)) return q

  const allItems = []
  const itemRe = /\d+[.)]\s*([^0-9]+?)(?=\s*\d+[.)]|$)/g
  let match
  const itemsSource = q.question.replace(/\s*[Ww]hich\s+order.*/s, '')
  while ((match = itemRe.exec(itemsSource)) !== null) {
    const item = match[1].trim().replace(/[,.]$/, '')
    if (item) allItems.push(item)
  }

  if (allItems.length < 2) return q

  const questionClean = q.question
    .replace(/\b1[.)].+?(?=\s*[Ww]hich|\s*$)/s, '')
    .replace(/\s*[Ii]tems?:?\s*/i, '')
    .trim()
    || 'Which order is correct?'

  return { ...q, question: questionClean, items: allItems }
}

function QuitPopup({ visible, onStay, onLeave }) {
  const lang = useLang()
  if (!visible) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.92)' }}>
      <div style={{ background: 'white', borderRadius: 24, border: '2px solid #e5e7eb', padding: '20px 24px', maxWidth: 320, width: '90%', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 18, color: '#3c3c3c', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
          {t(lang, 'quiz_quit_title')}<br />{t(lang, 'quiz_quit_sub')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button onClick={onStay} style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '14px 0', borderRadius: 14, background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6', color: '#fff', fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t(lang, 'quiz_quit_stay')}
          </button>
          <button onClick={onLeave} style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '12px 0', borderRadius: 14, background: 'none', color: '#9ca3af', fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14 }}>
            {t(lang, 'quiz_quit_leave')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultsScreen({ questions, answers, topic, onDone, coinsEarned, isTrial = false, isReplay = false }) {
  const lang = useLang()
  const correct = questions.filter((q, i) => isAnswerCorrect(q, answers[i])).length
  const total   = questions.length
  const pct = Math.round((correct / total) * 100)

  let emoji, headlineKey, subKey
  if (pct === 100)    { emoji = '🏆'; headlineKey = 'quiz_results_perfect'; subKey = 'quiz_results_perfect_sub' }
  else if (pct >= 80) { emoji = '🎉'; headlineKey = 'quiz_results_great';   subKey = 'quiz_results_great_sub' }
  else if (pct >= 60) { emoji = '😊'; headlineKey = 'quiz_results_good';    subKey = 'quiz_results_good_sub' }
  else                { emoji = '💪'; headlineKey = 'quiz_results_keep';    subKey = 'quiz_results_keep_sub' }

  if (!isTrial && coinsEarned > 0) {
    return (
      <div style={{ height: '100dvh', background: '#1a1200', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 0 }}>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes coinpop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ animation: 'float 2s ease-in-out infinite', marginBottom: 24 }}>
          <img src="/coin-flower.png" alt="coins" style={{ width: 120, height: 120, objectFit: 'contain' }} />
        </div>
        <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 900, fontSize: 36, color: '#fbbf24', textAlign: 'center', lineHeight: 1.15, margin: 0, marginBottom: 10, letterSpacing: '-0.02em' }}>
          {lang === 'ar' ? `رائع! ربحت ${coinsEarned} عملة` : `Wow! You earned ${coinsEarned} coins 🎉`}
        </p>
        <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 18, color: 'rgba(251,191,36,0.55)', textAlign: 'center', margin: 0, marginBottom: 48 }}>
          {correct}/{total} {lang === 'ar' ? 'إجابة صحيحة' : 'correct answers'}
        </p>
        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(251,191,36,0.5)', margin: 0 }}>Your score</p>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800, color: '#fbbf24', margin: 0 }}>{correct}/{total}</p>
          </div>
        </div>
        <button
          onClick={onDone}
          style={{ width: '100%', maxWidth: 360, background: '#fbbf24', border: 'none', borderRadius: 24, padding: '20px 0', fontFamily: "'Baloo 2', sans-serif", fontWeight: 900, fontSize: 22, color: '#1a1200', cursor: 'pointer', boxShadow: '0 5px 0 #b45309', letterSpacing: '-0.01em' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {lang === 'ar' ? 'رائع! 🎁' : 'Awesome! 🎁'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white flex flex-col items-center px-6 py-10 gap-5" style={{ height: '100dvh', overflowY: 'auto' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <div style={{ animation: 'float 2s ease-in-out infinite' }}>
          <img src="/nav-profile.png" alt="" className="w-32 h-auto" />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 48 }}>{emoji}</p>
          <h2 className="font-display font-extrabold text-3xl text-ink mt-1">{t(lang, headlineKey)}</h2>
          <p className="font-body text-base text-muted mt-1">{t(lang, subKey)}</p>
        </div>
        {isTrial ? (
          <div className="flex items-center gap-4 rounded-2xl px-6 py-4 w-full" style={{ background: '#f5f3ff' }}>
            <span style={{ fontSize: 40 }}>🎯</span>
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>{lang === 'ar' ? 'نتيجتك' : 'Your score'}</p>
              <p className="font-display font-extrabold text-3xl" style={{ color: '#7c3aed' }}>{correct}/{total}</p>
            </div>
          </div>
        ) : isReplay ? (
          <div className="rounded-2xl px-6 py-4 text-center" style={{ background: '#fafafa', border: '2px solid #f3f4f6' }}>
            <p className="font-display font-bold text-base text-muted">{lang === 'ar' ? '✅ لقد أكملت هذا التحدي من قبل' : '✅ You already completed this quiz'}</p>
            <p className="font-body text-xs text-muted mt-1">{lang === 'ar' ? 'العملات تُمنح مرة واحدة فقط لكل تحدٍّ' : 'Coins are awarded once per quiz'}</p>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl px-6 py-4 w-full" style={{ background: '#f5f3ff' }}>
            <span style={{ fontSize: 40 }}>🎯</span>
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-widest" style={{ color: '#7c3aed' }}>{lang === 'ar' ? 'نتيجتك' : 'Your score'}</p>
              <p className="font-display font-extrabold text-3xl" style={{ color: '#7c3aed' }}>{correct}/{total}</p>
            </div>
          </div>
        )}
        <button onClick={onDone} className="w-full text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
          {t(lang, 'quiz_results_continue')}
        </button>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}

function getTrueFalseOptions(correctAnswer) {
  const a = (correctAnswer || '').toLowerCase()
  if (a === 'vrai' || a === 'faux')         return ['Vrai', 'Faux']
  if (a === 'صحيح' || a === 'خطأ')          return ['صحيح', 'خطأ']
  if (a === 'verdadero' || a === 'falso')   return ['Verdadero', 'Falso']
  if (a === 'wahr' || a === 'falsch')       return ['Wahr', 'Falsch']
  if (a === 'vero' || a === 'falso')        return ['Vero', 'Falso']
  return ['True', 'False']
}

function normalize(str) {
  return (String(str ?? '')).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064a')
    .replace(/^\u0627\u0644/, '')
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/^(les|des|un|une|le|la|l'|the|a|an)\s+/i, '').trim()
    .replace(/[.,!?;:"']/g, '')
}

function answersMatch(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return true
  const isLatin = s => /^[\x20-\x7E]+$/.test(s)
  if (isLatin(na) && isLatin(nb)) return na.replace(/s/,'')===nb.replace(/s/, '')
  return false
}

function wordSetMatches(selectedPhrases, targetPhrases) {
  if (!Array.isArray(selectedPhrases) || !Array.isArray(targetPhrases)) return false
  const required = targetPhrases.filter(w => !FORGIVEN_WORDS.has(normalize(w)))
  const selected  = selectedPhrases.filter(w => !FORGIVEN_WORDS.has(normalize(w)))
  if (selected.length !== required.length) return false
  const norm = arr => arr.map(normalize).sort()
  const a = norm(selected), b = norm(required)
  return a.every((w, i) => w === b[i])
}

// typed answers + choice/reason use the human-like grading in lib/grading.js
function isAnswerCorrect(q, answer) {
  if (!q) return false
  if (q.type === 'text_highlight') return wordSetMatches(answer, q.target_words)
  if (q.type === 'fill_blank' || q.type === 'short_answer' || q.type === 'choice_reason') {
    return gradeAnswer(q, answer).correct
  }
  return answersMatch(answer, q.correct_answer)
}

function MCQCard({ option, selected, revealed, correct, onSelect, big }) {
  const isSelected = selected === option
  const isCorrect  = option === correct

  let borderColor = '#e5e7eb', bgColor = 'white', textColor = '#3C3C3C'
  if (revealed) {
    if (isCorrect)       { borderColor = '#86efac'; bgColor = '#f0fdf4'; textColor = '#16a34a' }
    else if (isSelected) { borderColor = '#fca5a5'; bgColor = '#fff5f5'; textColor = '#ef4444' }
    else                 { borderColor = '#f3f4f6'; textColor = '#d1d5db' }
  } else if (isSelected) { borderColor = '#a78bfa'; bgColor = '#f5f3ff'; textColor = '#7c3aed' }

  return (
    <button
      disabled={revealed}
      onClick={() => onSelect(option)}
      className={`w-full rounded-2xl border-2 font-display font-bold transition-all active:scale-[0.97] select-none ${big ? 'text-2xl h-24 flex items-center justify-center' : 'text-lg px-5 py-5 text-left flex items-center'}`}
      style={{
        borderColor, background: bgColor, color: textColor,
        boxShadow: !revealed && !isSelected ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
        animation: revealed && isSelected ? (isCorrect ? 'pop 0.35s ease-out' : 'shake 0.4s ease-in-out') : undefined,
      }}
    >
      {option}
    </button>
  )
}

function ItemsList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div style={{
      background: '#f8f7ff',
      border: '2px solid #ede9fe',
      borderRadius: 16,
      padding: '10px 14px',
      marginBottom: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 13,
            color: '#7c3aed',
            minWidth: 20,
            lineHeight: 1.4,
            flexShrink: 0,
          }}>{i + 1}.</span>
          <span style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 13,
            color: '#1f2937',
            lineHeight: 1.4,
          }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

function VisualCountRow({ asset, quantity }) {
  const src = getAssetPath(asset)
  return (
    <div className="flex flex-wrap gap-2 justify-center rounded-2xl px-4 py-5 mb-4" style={{ background: '#fafafa', border: '2px solid #f3f4f6' }}>
      {Array.from({ length: quantity }).map((_, i) => (
        src
          ? <img key={i} src={src} alt={asset} style={{ width: 40, height: 40 }} />
          : <span key={i} style={{ fontSize: 36, lineHeight: 1 }}>❓</span>
      ))}
    </div>
  )
}

function TextHighlight({ text, selectedPhrases, revealed, targetWords, onTogglePhraseAt }) {
  const tokens = useMemo(() => {
    if (!text) return []
    const words = text.split(/(\s+)/)
    const result = []
    let i = 0
    while (i < words.length) {
      if (/^\s+$/.test(words[i])) { result.push({ type: 'space', value: words[i] }); i++; continue }
      let matched = false
      for (const phrase of (targetWords || [])) {
        const phraseWords = phrase.split(/\s+/)
        if (phraseWords.length < 2) continue
        const wordTokens = words.slice(i).filter(w => !/^\s+$/.test(w))
        if (phraseWords.every((pw, pi) => normalize(wordTokens[pi]) === normalize(pw))) {
          result.push({ type: 'phrase', value: phrase, phraseWords })
          let consumed = 0, wi = i
          while (consumed < phraseWords.length && wi < words.length) {
            if (!/^\s+$/.test(words[wi])) consumed++
            wi++
          }
          if (wi < words.length && /^\s+$/.test(words[wi])) wi++
          i = wi; matched = true; break
        }
      }
      if (!matched) { result.push({ type: 'word', value: words[i] }); i++ }
    }
    return result
  }, [text, targetWords])

  const normTargets  = (targetWords || []).map(normalize)
  const normSelected = selectedPhrases.map(normalize)

  return (
    <div style={{ lineHeight: 2.0, padding: '4px 4px' }}>
      {tokens.map((token, i) => {
        if (token.type === 'space') return <span key={i}>{token.value}</span>

        const normVal  = normalize(token.value)
        const isForgiven = FORGIVEN_WORDS.has(normVal)
        const isTarget = normTargets.includes(normVal)
        const isSelected = normSelected.includes(normVal)

        if (isForgiven && !isTarget) {
          return (
            <span key={i} style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 16, color: '#1f2937' }}>
              {token.value}
            </span>
          )
        }

        let bg = 'transparent', color = '#1f2937', border = 'none'
        if (revealed) {
          if (isSelected && isTarget)       { bg = '#dcfce7'; color = '#16a34a'; border = '2px solid #86efac' }
          else if (isSelected && !isTarget) { bg = '#fee2e2'; color = '#ef4444'; border = '2px solid #fca5a5' }
          else if (!isSelected && isTarget) { bg = '#fff7ed'; color = '#d97706'; border = '2px dashed #fdba74' }
        } else if (isSelected) {
          bg = '#ede9fe'; color = '#7c3aed'; border = '2px solid #a78bfa'
        }

        return (
          <button
            key={i}
            disabled={revealed}
            onClick={() => onTogglePhraseAt(token.value)}
            style={{
              display: 'inline',
              background: bg,
              color,
              border,
              borderRadius: 8,
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              padding: '3px 6px',
              margin: '2px 1px',
              cursor: revealed ? 'default' : 'pointer',
              verticalAlign: 'baseline',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {token.value}
          </button>
        )
      })}
    </div>
  )
}

function XIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function FireModeOverlay({ streakKey, consecutiveCorrect }) {
  const fireCount = Math.min(6 + consecutiveCorrect * 3, 30)
  const headCount = Math.min(2 + consecutiveCorrect * 2, 15)
  const { fires, heads } = useMemo(() => ({
    fires: Array.from({ length: fireCount }, () => ({ left: Math.random() * 100, delay: (Math.random() * 0.5).toFixed(2), duration: (0.8 + Math.random() * 0.8).toFixed(2), size: 28 + Math.random() * 32 })),
    heads: Array.from({ length: headCount }, () => ({ left: Math.random() * 95, delay: (Math.random() * 0.6).toFixed(2), duration: (0.9 + Math.random() * 1.0).toFixed(2), size: 50 + Math.random() * 60, rotate: ((Math.random() - 0.5) * 60).toFixed(1) })),
  }), [streakKey])

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {fires.map((p, i) => (
        <div key={`fire-${i}`} style={{ position: 'absolute', bottom: -80, left: `${p.left}%`, fontSize: p.size, opacity: 0, animation: `fire-rise ${p.duration}s ${p.delay}s ease-out both` }}>🔥</div>
      ))}
      {heads.map((p, i) => (
        <div key={`head-${i}`} style={{ position: 'absolute', bottom: -100, left: `${p.left}%`, width: p.size, height: p.size, opacity: 0, transform: `rotate(${p.rotate}deg)`, animation: `fire-rise ${p.duration}s ${p.delay}s ease-out both` }}>
          <img src="/nav-profile.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ))}
      <style>{`@keyframes fire-rise{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}80%{opacity:0.9}100%{transform:translateY(-110vh) rotate(180deg) scale(0.5);opacity:0}}`}</style>
    </div>
  )
}

export default function Quiz({ exam, onDone, onQuit, kidId, isTrial = false }) {
  const lang = useLang()

  const questions = useMemo(
    () => (exam.questions || []).map(cleanQuestion),
    [exam.questions]
  )
  const topic = exam.topic || 'Quiz'

  const [idx,                setIdx]               = useState(0)
  const [selected,           setSelected]          = useState(null)
  const [revealed,           setRevealed]          = useState(false)
  const [answers,            setAnswers]           = useState([])
  const [showQuit,           setShowQuit]          = useState(false)
  const [showResults,        setShowResults]       = useState(false)
  const [showStreak,         setShowStreak]        = useState(false)
  const [streakCount,        setStreakCount]       = useState(0)
  const fillBlankRef         = useRef('')
  // fillBlankDisplay tracks the typed value so the CHECK button re-renders
  // (also used for short_answer, which is typed the same way)
  const [fillBlankDisplay,   setFillBlankDisplay]  = useState('')
  // choice_reason: the "why" text
  const reasonRef            = useRef('')
  const [reasonDisplay,      setReasonDisplay]     = useState('')
  const [selectedPhrases,    setSelectedPhrases]   = useState([])
  const [saving,             setSaving]            = useState(false)
  const [coinSaveError,      setCoinSaveError]     = useState(false)
  const [coinsEarned,        setCoinsEarned]       = useState(0)
  const [isReplay,           setIsReplay]          = useState(false)
  const [consecutiveCorrect, setConsecutiveCorrect]= useState(0)
  const [fireKey,            setFireKey]           = useState(0)

  const questionStartRef = useRef(Date.now())

  useEffect(() => {
    questionStartRef.current = Date.now()
    fillBlankRef.current = ''
    reasonRef.current = ''
    setFillBlankDisplay('')
    setReasonDisplay('')
    setSelectedPhrases([])
  }, [idx])

  const q             = questions[idx]
  const total         = questions.length
  const progressScale = (idx + (revealed ? 1 : 0)) / Math.max(total, 1)
  const onFire        = consecutiveCorrect >= 2

  const isTyped = q?.type === 'fill_blank' || q?.type === 'short_answer'

  function currentAnswer() {
    if (isTyped)                       return fillBlankRef.current
    if (q?.type === 'choice_reason')   return { choice: selected, reason: reasonRef.current }
    if (q?.type === 'text_highlight')  return selectedPhrases
    return selected
  }

  function checkCorrect(answer) { return isAnswerCorrect(q, answer) }
  const isCorrect = revealed && checkCorrect(currentAnswer())
  const isPartial = revealed && !isCorrect &&
    (q?.type === 'short_answer' || q?.type === 'choice_reason') &&
    !!gradeAnswer(q, currentAnswer()).partial
  const ALMOST = lang === 'ar' ? 'تقريباً!' : lang === 'fr' ? 'Presque !' : 'Almost!'

  function togglePhrase(phraseValue) {
    if (revealed) return
    const normVal = normalize(phraseValue)
    setSelectedPhrases(prev => {
      const already = prev.some(p => normalize(p) === normVal)
      return already ? prev.filter(p => normalize(p) !== normVal) : [...prev, phraseValue]
    })
  }

  async function handleContinue() {
    const answer     = currentAnswer()
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    if (idx === total - 1) {
      if (isTrial) { setShowResults(true); return }
      setSaving(true); setCoinSaveError(false)
      try {
        const correctCount = questions.filter((q, i) => {
          const a = i === idx ? answer : answers[i]
          return isAnswerCorrect(q, a)
        }).length
        const wrongIds = questions
          .map((q, i) => ({ q, a: i === idx ? answer : answers[i] }))
          .filter(({ q, a }) => !isAnswerCorrect(q, a))
          .map(({ q }) => q.id)
        const { coinsAwarded } = await completeQuiz(exam.id, kidId, { correct: correctCount, total, wrongIds })
        setCoinsEarned(coinsAwarded)
        if (coinsAwarded === 0) setIsReplay(true)
        const { streakCount: sc, isNewDay } = await updateStreak(kidId)
        if (isNewDay) { setStreakCount(sc); setShowStreak(true) } else { setShowResults(true) }
      } catch (e) { console.error(e); setCoinSaveError(true); setSaving(false) }
      setSaving(false)
      return
    }
    setIdx(i => i + 1); setSelected(null); setRevealed(false)
  }

  function handleCheck() {
    const answer = currentAnswer()
    const emptyAnswer =
      q.type === 'text_highlight' ? selectedPhrases.length === 0 :
      isTyped                     ? fillBlankRef.current.trim() === '' :
      q.type === 'choice_reason'  ? (!selected || reasonRef.current.trim() === '') :
      (!answer && answer !== false)
    if (emptyAnswer) return

    setRevealed(true)
    if (isTyped) setFillBlankDisplay(fillBlankRef.current)
    if (q.type === 'choice_reason') setReasonDisplay(reasonRef.current)
    const correct = isAnswerCorrect(q, answer)
    feedbackSound(correct)
    buzz(correct)
    if (correct) {
      setConsecutiveCorrect(c => {
        const next = c + 1
        if (next >= 2) setFireKey(k => k + 1)
        return next
      })
    } else { setConsecutiveCorrect(0) }

    if (!isTrial && kidId) {
      const timeSeconds = Math.round((Date.now() - questionStartRef.current) / 1000)
      // keep the logged answer a plain string for choice_reason
      const givenAnswer = q.type === 'choice_reason' ? `${answer.choice} — ${answer.reason}` : answer
      logQuestionAttempt({ examId: exam.id, kidId, question: q, isCorrect: correct, givenAnswer, timeSeconds })
    }
  }

  if (showStreak) return <StreakPopup streakCount={streakCount} onClose={() => { setShowStreak(false); setShowResults(true) }} />

  if (coinSaveError) return (
    <div className="flex items-center justify-center bg-white" style={{ height: '100dvh' }}>
      <div className="flex flex-col items-center gap-6 px-8 max-w-sm text-center">
        <img src="/nav-profile.png" alt="" className="w-28 h-auto" />
        <p className="font-display font-bold text-xl text-ink">{lang === 'ar' ? 'تعذّر حفظ عملاتك 😅' : "Couldn't save your coins 😅"}</p>
        <p className="font-body text-sm text-muted">{lang === 'ar' ? 'تحقق من اتصالك بالإنترنت وحاول مجدداً' : 'Check your connection and try again'}</p>
        <button onClick={async () => {
          setCoinSaveError(false); setSaving(true)
          try {
            const correctCount = questions.filter((q, i) => isAnswerCorrect(q, answers[i])).length
            const wrongIds = questions.filter((q, i) => !isAnswerCorrect(q, answers[i])).map(q => q.id)
            const { coinsAwarded } = await completeQuiz(exam.id, kidId, { correct: correctCount, total, wrongIds })
            setCoinsEarned(coinsAwarded); if (coinsAwarded === 0) setIsReplay(true)
            const { streakCount: sc, isNewDay } = await updateStreak(kidId)
            if (isNewDay) { setStreakCount(sc); setShowStreak(true) } else setShowResults(true)
          } catch { setCoinSaveError(true) }
          setSaving(false)
        }}
          className="w-full text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
          {lang === 'ar' ? 'حاول مجدداً' : 'Try again'}
        </button>
      </div>
    </div>
  )

  if (showResults) return (
    <ResultsScreen
      questions={questions}
      answers={answers}
      topic={topic}
      onDone={onDone}
      coinsEarned={coinsEarned}
      isTrial={isTrial}
      isReplay={isReplay}
    />
  )
  if (!q) return null

  const checkDisabled =
    isTyped                     ? fillBlankDisplay.trim() === '' :
    q.type === 'choice_reason'  ? (selected === null || reasonDisplay.trim() === '') :
    q.type === 'text_highlight' ? selectedPhrases.length === 0 :
    selected === null

  return (
    <div className="flex items-center justify-center bg-white" style={{ height: '100dvh', overflow: 'hidden' }}>
      <QuitPopup visible={showQuit} onStay={() => setShowQuit(false)} onLeave={onQuit || onDone} />
      {onFire && revealed && <FireModeOverlay streakKey={fireKey} consecutiveCorrect={consecutiveCorrect} />}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}} @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>

      <div className="flex flex-col bg-white w-full max-w-sm" style={{ height: '100dvh' }}>

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-2 pb-1">
          <button onClick={() => setShowQuit(true)} className="w-11 h-11 flex items-center justify-center rounded-full text-gray-300 active:bg-gray-100">
            <XIcon />
          </button>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
            <div className="h-full rounded-full origin-left"
              style={{ transform: `scaleX(${progressScale})`, transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)', background: onFire && revealed ? 'linear-gradient(90deg,#ff4b4b,#ff9600)' : '#7c3aed' }} />
          </div>
          <span className="font-display font-bold text-sm text-muted">{idx + 1}/{total}</span>
        </div>

        {/* Topic */}
        <div className="flex-shrink-0 px-5 pt-2 pb-1">
          <p className="font-body font-bold text-xs tracking-widest uppercase truncate" style={{ color: '#7c3aed' }}>{topic}</p>
        </div>

        {/* Question */}
        <div className="flex-shrink-0 px-6 pt-4 pb-3" style={{ maxHeight: '30%', overflowY: 'auto' }}>
          <p className={`font-display font-bold text-ink leading-snug ${q.question.split(/\s+/).length > 14 ? 'text-xl' : 'text-2xl'}`}>{q.question}</p>
        </div>

        {/* Answers */}
        <div className="px-4 mt-2 flex-1 overflow-y-auto flex flex-col gap-3">

          {q.type === 'mcq' && (
            <>
              <ItemsList items={q.items} />
              {q.options.map((option, optIdx) => (
                <MCQCard
                  key={`${optIdx}-${option}`}
                  option={option}
                  selected={selected}
                  revealed={revealed}
                  correct={q.correct_answer}
                  onSelect={setSelected}
                />
              ))}
            </>
          )}

          {q.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {getTrueFalseOptions(q.correct_answer).map(option => (
                <MCQCard key={option} option={option} selected={selected} revealed={revealed} correct={q.correct_answer} onSelect={setSelected} big />
              ))}
            </div>
          )}

          {q.type === 'fill_blank' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                defaultValue=""
                ref={el => { if (el && !revealed) el.value = fillBlankRef.current }}
                onChange={e => {
                  fillBlankRef.current = e.target.value
                  setFillBlankDisplay(e.target.value)
                }}
                onBlur={e => {
                  fillBlankRef.current = e.target.value
                  setFillBlankDisplay(e.target.value)
                }}
                disabled={revealed}
                autoFocus
                placeholder={t(lang, 'quiz_fill_placeholder')}
                className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
                style={{
                  animation: revealed && !checkCorrect(fillBlankRef.current) ? 'shake 0.4s ease-in-out' : undefined,
                  border: `2px solid ${revealed ? checkCorrect(fillBlankRef.current) ? '#86efac' : '#fca5a5' : '#e5e7eb'}`,
                  background: revealed ? checkCorrect(fillBlankRef.current) ? '#f0fdf4' : '#fff5f5' : '#fafafa',
                }}
              />
              {revealed && !checkCorrect(fillBlankRef.current) && (
                <p className="font-body text-sm font-bold px-1" style={{ color: '#7c3aed' }}>
                  {t(lang, 'quiz_correct_answer', q.correct_answer)}
                </p>
              )}
            </div>
          )}

          {/* NEW: short_answer = typed sentence, graded by keywords */}
          {q.type === 'short_answer' && (
            <div className="flex flex-col gap-3">
              <textarea
                key={`sa-${idx}`}
                rows={3}
                defaultValue=""
                ref={el => { if (el && !revealed) el.value = fillBlankRef.current }}
                onChange={e => {
                  fillBlankRef.current = e.target.value
                  setFillBlankDisplay(e.target.value)
                }}
                onBlur={e => {
                  fillBlankRef.current = e.target.value
                  setFillBlankDisplay(e.target.value)
                }}
                disabled={revealed}
                autoFocus
                placeholder={t(lang, 'quiz_fill_placeholder')}
                className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
                style={{
                  resize: 'none',
                  border: `2px solid ${revealed ? (isCorrect ? '#86efac' : isPartial ? '#fcd34d' : '#fca5a5') : '#e5e7eb'}`,
                  background: revealed ? (isCorrect ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fff5f5') : '#fafafa',
                }}
              />
              {revealed && !isCorrect && (
                <p className="font-body text-sm font-bold px-1" style={{ color: '#7c3aed' }}>
                  {t(lang, 'quiz_correct_answer', q.correct_answer)}
                </p>
              )}
            </div>
          )}

          {/* NEW: choice_reason = pick a choice, then type why */}
          {q.type === 'choice_reason' && (
            <div className="flex flex-col gap-3">
              {q.options.map((option, optIdx) => (
                <MCQCard
                  key={`${optIdx}-${option}`}
                  option={option}
                  selected={selected}
                  revealed={revealed}
                  correct={q.correct_answer}
                  onSelect={setSelected}
                />
              ))}
              <textarea
                key={`cr-${idx}`}
                rows={3}
                defaultValue=""
                ref={el => { if (el && !revealed) el.value = reasonRef.current }}
                onChange={e => {
                  reasonRef.current = e.target.value
                  setReasonDisplay(e.target.value)
                }}
                onBlur={e => {
                  reasonRef.current = e.target.value
                  setReasonDisplay(e.target.value)
                }}
                disabled={revealed}
                placeholder={lang === 'ar' ? 'اكتب السبب…' : lang === 'fr' ? 'Écris pourquoi…' : 'Write why…'}
                className="w-full rounded-2xl px-4 py-3 font-display font-bold text-base text-ink outline-none transition-colors"
                style={{
                  resize: 'none',
                  border: `2px solid ${revealed ? (isCorrect ? '#86efac' : isPartial ? '#fcd34d' : '#fca5a5') : '#e5e7eb'}`,
                  background: revealed ? (isCorrect ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fff5f5') : '#fafafa',
                }}
              />
            </div>
          )}

          {q.type === 'visual_count' && (
            <div className="flex flex-col gap-3">
              <VisualCountRow asset={q.asset} quantity={q.quantity} />
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((option, optIdx) => (
                  <MCQCard key={`${optIdx}-${option}`} option={option} selected={selected} revealed={revealed} correct={q.correct_answer} onSelect={setSelected} big />
                ))}
              </div>
            </div>
          )}

          {q.type === 'text_highlight' && (
            <TextHighlight
              text={q.text}
              selectedPhrases={selectedPhrases}
              revealed={revealed}
              targetWords={q.target_words}
              onTogglePhraseAt={togglePhrase}
            />
          )}

          {revealed && !isCorrect && q.explanation && (
            <div className="rounded-2xl px-4 py-3" style={{ background: '#f5f3ff', border: '2px solid #ede9fe' }}>
              <p className="font-body text-sm leading-snug" style={{ color: '#7c3aed' }}>💡 {q.explanation}</p>
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div className="flex-shrink-0 px-4 pt-2 pb-6">
          {!revealed ? (
            <button
              disabled={checkDisabled}
              onClick={handleCheck}
              className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all tracking-widest active:scale-95"
              style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}
            >
              {t(lang, 'quiz_check')}
            </button>
          ) : (
            <div className="rounded-2xl overflow-hidden border-2" style={{ borderColor: isCorrect ? '#86efac' : isPartial ? '#fcd34d' : '#fca5a5', background: isCorrect ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fff5f5' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{isCorrect ? '🎉' : isPartial ? '🙂' : '💪'}</span>
                <p className="font-display font-bold text-base text-ink">{isCorrect ? t(lang, 'quiz_correct') : isPartial ? ALMOST : t(lang, 'quiz_not_quite')}</p>
              </div>
              <button
                onClick={handleContinue}
                disabled={saving}
                className="w-full py-3 font-display font-bold text-lg tracking-widest text-white active:scale-[0.99] transition-all"
                style={{ background: isCorrect ? '#7c3aed' : '#f59e0b', boxShadow: isCorrect ? '0 4px 0 #5b21b6' : '0 4px 0 #d97706' }}
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
