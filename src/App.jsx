import { useEffect, useState } from 'react'
import { ensureAuth } from './lib/auth'
import Onboarding from './screens/Onboarding'
import Activation from './screens/Activation'
import { getStreak } from './lib/economy'
import { getKids, createKid } from './lib/kids'
import Nav from './components/Nav'
import Chapters from './screens/Chapters'
import CurrentChapter from './screens/CurrentChapter'
import Home from './screens/Home'
import Revision from './screens/Revision'
import Quiz from './screens/Quiz'
import Rewards from './screens/Rewards'
import ParentZone from './screens/ParentZone'
import PinGate from './screens/PinGate'
import QuizIntro from './screens/QuizIntro'
import Profile from './screens/Profile'
import { LangContext } from './lib/LangContext'
import { KidContext } from './lib/KidContext'

const HIDE_NAV = ['quiz', 'scan', 'quiz_intro']

export default function App() {
  const [authReady, setAuthReady]     = useState(false)
  const [streak, setStreak]           = useState(0)
  const [lang, setLang]               = useState('en')

  // Sync html element lang + dir for screen readers and SEO
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  const [onboarded, setOnboarded]     = useState(null)
  const [activated, setActivated]     = useState(false)
  const [activationExam, setActivationExam] = useState(null)
  const [tab, setTab]                 = useState('chapters')
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [parentZoneDefaultTab, setParentZoneDefaultTab] = useState('rewards')
  const [kids, setKids]               = useState([])
  const [activeKid, setActiveKid]     = useState(null)

  const [nav, setNav] = useState({
    screen: 'chapters', chapter: null, exam: null, revisionExams: [],
  })

  useEffect(() => {
    ensureAuth().then(async () => {
      try {
        const { supabase } = await import('./lib/supabaseClient')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.is_anonymous) { setOnboarded(false); return }

        const { data } = await supabase.from('profiles').select('display_name, language, activated').eq('id', user.id).single()
        setOnboarded(!!data?.display_name)
        if (data?.activated) setActivated(true)
        if (data?.language) setLang(data.language)

        if (data?.display_name) {
          // Load kids
          const kidList = await getKids()
          if (kidList.length === 0) {
            // Migrate: create first kid from display_name
            const firstKid = await createKid(data.display_name)
            setKids([firstKid])
            setActiveKid(firstKid)
            getStreak(firstKid.id).then(s => setStreak(s.count)).catch(() => {})
          } else {
            setKids(kidList)
            setActiveKid(kidList[0])
            getStreak(kidList[0].id).then(s => setStreak(s.count)).catch(() => {})
          }
        }
      } catch { setOnboarded(false) }
    }).finally(() => setAuthReady(true))
  }, [])

  // When active kid changes, reload streak
  useEffect(() => {
    if (!activeKid) return
    getStreak(activeKid.id).then(s => setStreak(s.count)).catch(() => {})
  }, [activeKid?.id])

  if (!authReady || onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
      </div>
    )
  }

  if (!onboarded) {
    return (
      <LangContext.Provider value={lang}>
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Onboarding
            onComplete={async (kidName) => {
              setOnboarded(true)
              const kidList = await getKids()
              let kid
              if (kidList.length === 0) {
                kid = await createKid(kidName || 'Kid 1')
                setKids([kid])
              } else {
                setKids(kidList)
                kid = kidList[0]
              }
              setActiveKid(kid)
              getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
            }}
            onLanguageChange={setLang}
          />
        </div>
      </LangContext.Provider>
    )
  }

  if (!activated) {
    return (
      <LangContext.Provider value={lang}>
        <Activation
          kidId={activeKid?.id}
          onComplete={async (exam) => {
            // Mark activated in profiles
            const { supabase } = await import('./lib/supabaseClient')
            const { data: { user } } = await supabase.auth.getUser()
            if (user) await supabase.from('profiles').update({ activated: true }).eq('id', user.id)
            // Set exam in nav state FIRST, then activate
            setNav(prev => ({ ...prev, screen: 'quiz', exam }))
            setActivationExam(exam)
            setActivated(true)
          }}
        />
      </LangContext.Provider>
    )
  }

  const { screen, chapter, exam, revisionExams } = nav

  function go(updates) { setNav(prev => ({ ...prev, ...updates })) }

  function handleTabChange(newTab) {
    setTab(newTab)
    if (newTab !== 'parent_zone') { setPinUnlocked(false); setParentZoneDefaultTab('rewards') }
    go({ screen: newTab, chapter: null, exam: null, revisionExams: [] })
  }

  const showNav = !HIDE_NAV.includes(screen)

  const kidContextValue = {
    activeKid,
    kids,
    setActiveKid: (kid) => {
      setActiveKid(kid)
      // Reset to chapters when switching kid
      go({ screen: 'chapters', chapter: null, exam: null, revisionExams: [] })
      setTab('chapters')
    },
    setKids,
  }

  return (
    <LangContext.Provider value={lang}>
      <KidContext.Provider value={kidContextValue}>
        <div className="flex" dir={lang === 'ar' ? 'rtl' : 'ltr'}
          style={{ overflow: 'hidden', maxWidth: '100vw', width: '100%' }}>

          {showNav && <Nav active={tab} onChange={handleTabChange} streak={streak} />}

          <main
            className={`flex-1 ${showNav ? 'md:ms-56' : ''}`}
            style={{ paddingBottom: showNav ? 'calc(64px + env(safe-area-inset-bottom))' : 0, overflow: 'hidden', minWidth: 0, width: '100%' }}
          >
            {screen === 'chapters' && (
              <Chapters
                kidId={activeKid?.id}
                onSelectChapter={c => go({ screen: 'current_chapter', chapter: c })}
              />
            )}

            {screen === 'current_chapter' && (
              <CurrentChapter
                chapter={chapter}
                kidId={activeKid?.id}
                onNew={c => go({ screen: 'scan', chapter: c, exam: null })}
                onRevision={(c, exams) => go({ screen: 'revision', chapter: c, revisionExams: exams })}
                onBack={() => go({ screen: 'chapters' })}
              />
            )}

            {screen === 'scan' && (
              <Home
                chapter={chapter}
                kidId={activeKid?.id}
                onExamReady={freshExam => go({ screen: 'quiz_intro', exam: freshExam })}
                onBack={() => go({ screen: 'current_chapter' })}
              />
            )}

            {screen === 'revision' && (
              <Revision
                chapter={chapter}
                exams={revisionExams}
                onSelectExam={e => go({ screen: 'quiz_intro', exam: e })}
                onBack={() => go({ screen: 'current_chapter' })}
              />
            )}

            {screen === 'quiz_intro' && exam && (
              <QuizIntro
                exam={exam || activationExam}
                kidName={activeKid?.name}
                onStart={() => go({ screen: 'quiz' })}
                onBack={() => go({ screen: 'current_chapter' })}
              />
            )}

            {screen === 'quiz' && (exam || activationExam) && (
              <Quiz
                exam={exam || activationExam}
                kidId={activeKid?.id}
                onDone={() => {
                  // If coming from activation flow, go to chapters not current_chapter
                  const dest = activationExam && !exam ? 'chapters' : 'current_chapter'
                  setActivationExam(null)
                  go({ screen: dest })
                  if (activeKid) getStreak(activeKid.id).then(s => setStreak(s.count)).catch(() => {})
                }}
              />
            )}

            {screen === 'rewards'     && <Rewards kidId={activeKid?.id} onNavigateToParentZone={() => { setParentZoneDefaultTab('claims'); setTab('parent_zone'); go({ screen: 'parent_zone' }) }} />}

            {screen === 'parent_zone' && !pinUnlocked && (
              <PinGate onSuccess={() => setPinUnlocked(true)} onBack={() => go({ screen: 'chapters' })} />
            )}
            {screen === 'parent_zone' && pinUnlocked && <ParentZone defaultTab={parentZoneDefaultTab} />}

            {screen === 'profile' && (
              <Profile
                onLogout={() => {
                  setOnboarded(false)
                  setKids([])
                  setActiveKid(null)
                }}
              />
            )}
          </main>
        </div>
      </KidContext.Provider>
    </LangContext.Provider>
  )
}
