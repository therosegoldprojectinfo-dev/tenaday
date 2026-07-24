import { useEffect, useState } from 'react'
import { ensureAuth } from './lib/auth'
import Nav from './components/Nav'
import Chapters from './screens/Chapters'
import CurrentChapter from './screens/CurrentChapter'
import Home from './screens/Home'
import Revision from './screens/Revision'
import Quiz from './screens/Quiz'
import Rewards from './screens/Rewards'
import ParentZone from './screens/ParentZone'

// Screens where Nav is hidden (full-screen flows)
const HIDE_NAV = ['quiz', 'scan']

export default function App() {
  const [authReady, setAuthReady]         = useState(false)
  const [tab, setTab]                     = useState('chapters') // active nav tab
  const [screen, setScreen]               = useState('chapters') // current screen
  const [activeChapter, setActiveChapter] = useState(null)
  const [activeExam, setActiveExam]       = useState(null)
  const [revisionExams, setRevisionExams] = useState([])

  useEffect(() => {
    ensureAuth().finally(() => setAuthReady(true))
  }, [])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
      </div>
    )
  }

  // ── Nav tab change ────────────────────────────────────────────

  function handleTabChange(newTab) {
    setTab(newTab)
    setScreen(newTab)
    // Reset chapter flow when switching tabs
    setActiveChapter(null)
    setActiveExam(null)
  }

  // ── Chapter flow handlers ─────────────────────────────────────

  function goToChapter(chapter) {
    setActiveChapter(chapter)
    setScreen('current_chapter')
  }

  function goToScan(chapter) {
    setActiveChapter(chapter)
    setScreen('scan')
  }

  function goToRevision(chapter, exams) {
    setActiveChapter(chapter)
    setRevisionExams(exams)
    setScreen('revision')
  }

  function goToQuiz(exam) {
    setActiveExam(exam)
    setScreen('quiz')
  }

  function handleExamReady(exam) {
    setActiveExam(exam)
    setScreen('quiz')
  }

  function handleQuizDone() {
    setScreen('current_chapter')
  }

  const showNav = !HIDE_NAV.includes(screen)

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex">
      {/* Sidebar (desktop only) — always rendered when nav is visible */}
      {showNav && <Nav active={tab} onChange={handleTabChange} />}

      {/* Main content — offset on desktop to account for sidebar */}
      <main
        className={`flex-1 ${showNav ? 'md:ml-56' : ''}`}
        style={{ paddingBottom: showNav ? 'calc(64px + env(safe-area-inset-bottom))' : 0 }}
      >
        {screen === 'chapters' && (
          <Chapters onSelectChapter={goToChapter} />
        )}

        {screen === 'current_chapter' && (
          <CurrentChapter
            chapter={activeChapter}
            onNew={goToScan}
            onRevision={goToRevision}
            onBack={() => setScreen('chapters')}
          />
        )}

        {screen === 'scan' && (
          <Home
            chapter={activeChapter}
            onExamReady={handleExamReady}
            onBack={() => setScreen('current_chapter')}
          />
        )}

        {screen === 'revision' && (
          <Revision
            chapter={activeChapter}
            exams={revisionExams}
            onSelectExam={goToQuiz}
            onBack={() => setScreen('current_chapter')}
          />
        )}

        {screen === 'quiz' && (
          <Quiz
            exam={activeExam}
            onDone={handleQuizDone}
          />
        )}

        {screen === 'rewards' && <Rewards />}
        {screen === 'parent_zone' && <ParentZone />}
      </main>
    </div>
  )
}
