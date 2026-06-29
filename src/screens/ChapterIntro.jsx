import { useState } from 'react'
import { themeFor } from '../lib/eraTheme'
import { nextStep } from '../lib/progression'
import { updateProgress } from '../lib/kidData'

// ── Full app intro (very first session — Addition, Table 1, Batch 1) ─────
const APP_INTRO_SLIDES = [
  {
    emoji: '👋',
    title: "Welcome to Numio!",
    body: "Numio is your daily math adventure. Every day you learn 2 new math facts and practice them in 6 fun ways. It only takes about 10 minutes!",
  },
  {
    emoji: '__COIN__',
    title: "Earn coins!",
    body: "Every time you finish a session you earn coins. Save them up and trade them for real prizes your parent set up — like screen time or a special treat!",
  },
  {
    emoji: '🌸',
    title: "Never get stuck!",
    body: "Get something wrong? Numio's guide pops up with a hint and lets you try again. You always finish feeling great!",
  },
  {
    emoji: '🔓',
    title: "Come back every day",
    body: "Each day unlocks 2 new math facts. Finish today's session and come back tomorrow for more. The more days you play, the better you get!",
  },
  {
    emoji: '🚀',
    title: "Ready? Let's go!",
    body: "Your first lesson is about to start. You'll learn 2 new facts — just read them carefully and remember them. You've got this!",
  },
]

// ── Chapter intro (kid skipped here via diagnostic) ───────────────────────
function chapterSlides(operation, theme) {
  const labels = {
    subtraction: { emoji: '➖', name: 'Subtraction', hint: 'Taking away — figuring out what\'s left after something is removed.' },
    multiplication: { emoji: '✖️', name: 'Multiplication', hint: 'Repeated addition — a fast way to add the same number many times.' },
    division: { emoji: '➗', name: 'Division', hint: 'Splitting equally — sharing things so everyone gets a fair amount.' },
  }
  const info = labels[operation] || { emoji: '➕', name: 'Addition', hint: 'Putting things together.' }
  return [
    {
      emoji: info.emoji,
      title: `Welcome to ${info.name}!`,
      body: `Great job proving you're ready! ${info.hint} You'll start with the basics and work your way up — 2 new facts every day.`,
    },
    {
      emoji: '__COIN__',
      title: "Same rules, new chapter",
      body: "Everything works the same way — coins to earn, hints when you need them, and a new badge to unlock. Keep up your daily streak and you'll master this chapter too!",
    },
    {
      emoji: '🚀',
      title: "Let's start!",
      body: `Your first ${info.name} lesson is ready. Two new facts, six fun ways to practice. Let's go!`,
    },
  ]
}

export default function ChapterIntro({ operation, table, batchNum, node, kidId, isFirstEver, onDone }) {
  const theme = themeFor(operation)
  const slides = isFirstEver ? APP_INTRO_SLIDES : chapterSlides(operation, theme)
  const [idx, setIdx] = useState(0)
  const [saving, setSaving] = useState(false)

  const isLast = idx === slides.length - 1
  const slide  = slides[idx]

  async function handleNext() {
    if (!isLast) { setIdx(i => i + 1); return }
    setSaving(true)
    try {
      // Advance cursor to the next node (learn) — the intro replaced unlock
      const next = nextStep(operation, table, batchNum, node)
      if (next && kidId) await updateProgress(kidId, next)
    } catch (err) {
      console.error('Failed to advance after chapter intro:', err)
    } finally {
      setSaving(false)
      onDone?.()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[580px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col bg-white px-8 py-10">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 24 : 8,
                height: 8,
                backgroundColor: i === idx ? theme.colors.primary : '#E5E7EB',
              }}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <span
            className="text-8xl select-none"
            style={{ animation: 'correct-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {slide.emoji === '__HEART__'
              ? <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="160" height="160" alt="" />
              : slide.emoji === '__COIN__'
              ? <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="160" height="160" alt="" />
              : slide.emoji}
          </span>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 mb-3">{slide.title}</h1>
            <p className="font-body text-base text-gray-500 leading-relaxed max-w-[30ch] mx-auto">{slide.body}</p>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={saving}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest mt-8"
        >
          {saving ? 'STARTING…' : isLast ? "LET'S GO! →" : 'NEXT →'}
        </button>
      </div>
    </div>
  )
}
