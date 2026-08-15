import { useEffect, useState } from 'react'
import { ensureAuth } from './lib/auth'
import Login from './screens/Login'
import AccountCreation from './screens/AccountCreation'
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
import Heroes from './screens/Heroes'
import { useSubscription } from './lib/useSubscription'
import PostPaymentSetup from './screens/PostPaymentSetup'
import { LangContext } from './lib/LangContext'
import { KidContext } from './lib/KidContext'

const HIDE_NAV = ['quiz', 'scan', 'quiz_intro']

export default function App() {
  const [authReady, setAuthReady]     = useState(false)
  const [streak, setStreak]           = useState(0)
  const [lang, setLang]               = useState('en')

  // Detect post-payment redirect from Stripe
  const [sessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('session_id') || null
  })

  // Sync html element lang + dir for screen readers and SEO
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  const [onboarded, setOnboarded]     = useState(null)
  const { isInactive, checked } = useSubscription(onboarded === true)
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

  // Post-payment flow: only show if we have a session_id AND user is not already onboarded
  // This prevents refresh bypass — once onboarded is true, normal auth flow takes over
  if (sessionId && onboarded !== true) {
    return (
      <LangContext.Provider value={lang}>
        <PostPaymentSetup
          sessionId={sessionId}
          onComplete={async ({ kid }) => {
            // Clean session_id from URL without reload
            window.history.replaceState({}, '', window.location.pathname)
            if (kid) {
              setKids([kid])
              setActiveKid(kid)
              getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
            }
            setAuthReady(true)
            setOnboarded(true)
          }}
        />
      </LangContext.Provider>
    )
  }

  if (!authReady || onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
      </div>
    )
  }

  if (!onboarded) {
    // Show Login screen if user tapped "Already have an account"
    if (showOnboarding) {
      return (
        <LangContext.Provider value={lang}>
          <Login
            lang={lang}
            onLanguageChange={setLang}
            onTryFree={() => setShowOnboarding(false)}
            onSuccess={async (setLoginError) => {
              try {
                const { supabase } = await import('./lib/supabaseClient')
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const { data: prof } = await supabase.from('profiles').select('language').eq('id', user.id).single()
                  if (prof?.language) setLang(prof.language)
                }
              } catch (e) { console.error(e) }
              try {
                const kidList = await getKids()
                let kid
                if (kidList.length === 0) { kid = await createKid('Kid 1'); setKids([kid]) }
                else { setKids(kidList); kid = kidList[0] }
                setActiveKid(kid)
                getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
                setOnboarded(true)
              } catch (e) {
                console.error('Failed to load kids after login:', e)
                setLoginError?.(lang === 'ar' ? 'حدث خطأ ما. حاول مرة أخرى.' : 'Something went wrong. Please try again.')
              }
            }}
          />
        </LangContext.Provider>
      )
    }

    return (
      <LangContext.Provider value={lang}>
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <AccountCreation
            onLanguageChange={setLang}
            onLogin={() => setShowOnboarding(true)}
            onSignup={async ({ username, kidName, password, lang: signupLang }) => {
              const hashBuffer = async (input) => {
                const encoded = new TextEncoder().encode(input)
                const buf = await crypto.subtle.digest('SHA-256', encoded)
                return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
              }

              const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
              const derivedPw = await hashBuffer(`numio:${username.trim().toLowerCase()}:${password}:v3`)
              const pwHash    = await hashBuffer(`numio-pin:${password}`)

              const { supabase } = await import('./lib/supabaseClient')
              let isNewAccount = true
              const { error: signUpErr } = await supabase.auth.signUp({ email: fakeEmail, password: derivedPw })

              if (signUpErr) {
                const { error: signInErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
                if (signInErr) throw new Error(lang === 'ar' ? 'اسم المستخدم مستخدم بالفعل' : 'That username is already taken')
                isNewAccount = false
              }

              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('Signup failed')

              const { error: insertErr } = await supabase.from('profiles').insert({
                id: user.id, display_name: username.trim(), language: signupLang || lang,
              })
              if (insertErr && insertErr.code !== '23505') throw new Error(insertErr.message)
              if (insertErr?.code === '23505') {
                await supabase.from('profiles').update({
                  display_name: username.trim(), language: signupLang || lang,
                }).eq('id', user.id)
              }

              if (isNewAccount) {
                const { error: pinErr } = await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
                if (pinErr) {
                  await supabase.from('profiles').delete().eq('id', user.id)
                  throw new Error(pinErr.message)
                }
              } else {
                await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
              }

              let kid
              if (isNewAccount) {
                try {
                  // Use the kid's actual name instead of username
                  kid = await createKid(kidName.trim())
                } catch (e) {
                  console.error('kid creation failed:', e)
                  try {
                    const kidList = await getKids()
                    kid = kidList[0] || await createKid(kidName.trim())
                  } catch { throw new Error(lang === 'ar' ? 'حدث خطأ ما، حاول مجدداً' : 'Something went wrong, please try again') }
                }
              } else {
                try {
                  const kidList = await getKids()
                  kid = kidList[0]
                  setKids(kidList)
                } catch (e) {
                  throw new Error(lang === 'ar' ? 'حدث خطأ ما، حاول مجدداً' : 'Something went wrong, please try again')
                }
              }

              setActiveKid(kid)
              if (kid) getStreak(kid.id).then(s => setStreak(s.count)).catch(() => {})
              if (signupLang) setLang(signupLang)
              setOnboarded(true)
            }}
          />
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
            {/* No paywall — pay-first flow handled before login */}
            {false ? (
              <div/>
            ) : !activeKid && screen !== 'parent_zone' && screen !== 'profile' ? (
              <div className="flex flex-col items-center justify-center gap-6 text-center" style={{ height: '100dvh' }}>
                <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
                <p className="font-body text-sm text-muted">Loading...</p>
              </div>
            ) : (<>
            {screen === 'chapters' && (
              <Chapters
                kidId={activeKid?.id}
                streak={streak}
                activeKid={activeKid}
                onLeaderboard={() => go({ screen: 'heroes' })}
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

            {screen === 'heroes' && (
              <Heroes
                totalDays={streak}
                onBack={() => go({ screen: 'chapters' })}
              />
            )}
          </>
          )}

          </main>
        </div>
      </KidContext.Provider>
    </LangContext.Provider>
  )
}
