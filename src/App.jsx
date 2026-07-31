import { useEffect, useState } from 'react'
import { ensureAuth } from './lib/auth'
import Onboarding from './screens/Onboarding'
import TrialFlow from './screens/TrialFlow'
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
  const [showOnboarding, setShowOnboarding] = useState(false)
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

        const { data } = await supabase.from('profiles').select('display_name, language').eq('id', user.id).single()
        setOnboarded(!!data?.display_name)
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
          <TrialFlow
            lang={lang}
            onLanguageChange={setLang}
            onSignup={async ({ username, password, lang: signupLang, trialExam, showLogin }) => {
              // "Already have an account" → show Onboarding in login mode
              if (showLogin) {
                setShowOnboarding(true)
                return
              }

              // Derive credentials same way as Onboarding.jsx
              const hashBuffer = async (input) => {
                const encoded = new TextEncoder().encode(input)
                const buf = await crypto.subtle.digest('SHA-256', encoded)
                return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
              }

              const fakeEmail  = `${username.toLowerCase().replace(/\s+/g, '_')}@numio.app`
              const derivedPw  = await hashBuffer(`numio:${username.trim().toLowerCase()}:${password}:v3`)
              const pwHash     = await hashBuffer(`numio-pin:${password}`)

              const { supabase } = await import('./lib/supabaseClient')
              let isNewAccount = true
              const { error: signUpErr } = await supabase.auth.signUp({ email: fakeEmail, password: derivedPw })

              if (signUpErr) {
                // Prior attempt created auth row but failed on profile/PIN — recover it
                const { error: signInErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
                if (signInErr) throw new Error(lang === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'That username is already taken')
                isNewAccount = false // reconciling an existing account
              }

              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('Signup failed')

              // Only write profile if new account — upsert only updates safe columns
              // Use INSERT, and on conflict update only the columns we have grant for
              const { error: insertErr } = await supabase.from('profiles').insert({
                id: user.id, display_name: username.trim(), language: signupLang || lang,
              })
              // 23505 = unique violation = profile already exists, update safe columns only
              if (insertErr && insertErr.code !== '23505') throw new Error(insertErr.message)
              if (insertErr?.code === '23505') {
                await supabase.from('profiles').update({
                  display_name: username.trim(), language: signupLang || lang,
                }).eq('id', user.id)
              }

              // Only set PIN if this is a genuinely new account
              // On reconciliation the PIN already exists — don't overwrite or delete
              if (isNewAccount) {
                const { error: pinErr } = await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
                if (pinErr) {
                  // Fresh signup failed on PIN — safe to clean up the profile row
                  await supabase.from('profiles').delete().eq('id', user.id)
                  throw new Error(pinErr.message)
                }
              }

              // Migrate trial exam → "🎉 Your First Ever Numio Quiz" chapter
              let kid
              try {
                kid = await createKid(username.trim())
                if (trialExam && trialExam.id === 'trial') {
                  const { data: chapter } = await supabase.from('chapters')
                    .insert({ name: lang === 'ar' ? '🎉 أول اختبار Numio' : '🎉 Your First Ever Numio Quiz', emoji: '🎉', user_id: user.id, kid_id: kid.id })
                    .select().single()
                  if (chapter) {
                    await supabase.from('exams').insert({
                      user_id: user.id, kid_id: kid.id,
                      topic: trialExam.topic, questions: trialExam.questions,
                      chapter_id: chapter.id,
                    })
                  }
                  ;['numio_trial_exam','numio_trial_done','numio_trial_used'].forEach(k => localStorage.removeItem(k))
                }
              } catch (e) {
                console.error('kid/migration failed:', e)
                // Still try to get/create kid so app is not broken
                try {
                  const kidList = await getKids()
                  kid = kidList[0] || await createKid(username.trim())
                } catch { throw new Error(lang === 'ar' ? 'حدث خطأ ما، حاول مجدداً' : 'Something went wrong, please try again') }
              }

              setKids([kid])
              setActiveKid(kid)
              getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
              if (signupLang) setLang(signupLang)
              setOnboarded(true)
            }}
          />
          {showOnboarding && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'white' }}>
              <Onboarding
                onComplete={async (kidName) => {
                  setOnboarded(true)
                  setShowOnboarding(false)
                  try {
                    const { supabase } = await import('./lib/supabaseClient')
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      const { data: prof } = await supabase.from('profiles').select('language').eq('id', user.id).single()
                      if (prof?.language) setLang(prof.language)
                    }
                  } catch (e) { console.error(e) }
                  const kidList = await getKids()
                  let kid
                  if (kidList.length === 0) { kid = await createKid(kidName || 'Kid 1'); setKids([kid]) }
                  else { setKids(kidList); kid = kidList[0] }
                  setActiveKid(kid)
                  getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
                }}
                onLanguageChange={setLang}
              />
            </div>
          )}
        </div>
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

            {screen === 'current_chapter' && chapter && (
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
                exam={exam}
                kidName={activeKid?.name}
                onStart={() => go({ screen: 'quiz' })}
                onBack={() => go({ screen: 'current_chapter' })}
              />
            )}

            {screen === 'quiz' && exam && activeKid && (
              <Quiz
                exam={exam}
                kidId={activeKid?.id}
                onDone={() => {
                  // If coming from activation flow, go to chapters not current_chapter
                  go({ screen: 'current_chapter' })
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
                onLanguageChange={setLang}
              />
            )}
          </main>
        </div>
      </KidContext.Provider>
    </LangContext.Provider>
  )
}
