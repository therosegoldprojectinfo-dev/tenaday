import { useState, useEffect } from 'react'
import Map from './screens/Map'
import ChapterPath from './screens/ChapterPath'
import Practice from './screens/Practice'
import ChapterIntro from './screens/ChapterIntro'
import Diagnostic from './screens/Diagnostic'
import Rewards from './screens/Rewards'
import Profile from './screens/Profile'
import Auth from './screens/Auth'
import KidPicker from './screens/KidPicker'
import CreateKid from './screens/CreateKid'
import ChildOnboarding from './screens/ChildOnboarding'
import ParentPinEntry from './screens/ParentPinEntry'
import ParentDashboard from './screens/ParentDashboard'
import StreakSlide from './screens/StreakSlide'
import NavShell from './components/NavShell'
import { getSession, logOut as authLogOut } from './lib/parentAuth'
import { trackEvent } from './lib/analytics'

// Top-level app flow, in order:
//   'auth'        — parent signup/login (shown if no saved session)
//   'kidPicker'   — Netflix-style "who's playing" grid (shown after login)
//   'createKid'   — name/age/placement-claim form (shown from kidPicker's "Add kid")
//   'game'        — the actual app (chapter list / chapter path / practice / nav tabs),
//                    once a specific kid profile has been selected
//
// Session persistence (lib/parentAuth.js, localStorage-backed) means a
// returning parent skips straight to 'kidPicker' on reload instead of
// having to log in again every visit — but which KID was last active is
// intentionally NOT persisted across reloads; landing on the picker each
// time the app is freshly opened matches the Netflix-style mental model
// ("who's playing right now") better than silently resuming whoever
// played last, especially on a shared family device.
export default function App() {
  const [authPhase, setAuthPhase] = useState('checking') // 'checking' | 'auth' | 'kidPicker' | 'createKid' | 'diagnostic' | 'game'
  const [parentId, setParentId] = useState(null)
  const [kidId, setKidId] = useState(null)
  const [pendingClaim, setPendingClaim] = useState(null) // placement claim for the diagnostic phase
  const [selectedTables, setSelectedTables] = useState([]) // tables the kid picked in TablePicker
  const [showParentPin, setShowParentPin]   = useState(false)
  const [showParentDash, setShowParentDash] = useState(false)
  const [parentDashInitialTab, setParentDashInitialTab] = useState('kids')

  // Game-level navigation state (only meaningful once authPhase === 'game')
  const [navTab, setNavTab] = useState('home') // 'home' | 'rewards' | 'profile'
  const [screen, setScreen] = useState('list')       // 'list' | 'path' | 'play'
  const [activeChapter, setActiveChapter] = useState(null)
  const [activeNode, setActiveNode] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [onboardingStartStep, setOnboardingStartStep] = useState(0)
  const [onboardingKidName, setOnboardingKidName] = useState('')
  const [onboardingKidAge, setOnboardingKidAge] = useState('')
  const [showStreakSlide,  setShowStreakSlide]  = useState(false)
  const [streakCount,    setStreakCount]    = useState(1)
  const [streakTrigger,  setStreakTrigger]  = useState('welcome')

  // Persist kidId + current phase to sessionStorage so page refresh
  // brings you back to where you were instead of dropping you to kidPicker.
  // sessionStorage is cleared when the tab/browser closes — intentional.
  useEffect(() => {
    if (kidId && authPhase === 'game') {
      try {
        sessionStorage.setItem('numio_kid', JSON.stringify({ kidId, navTab, screen, phase: 'game' }))
      } catch {}
    } else if (kidId && authPhase === 'diagnostic') {
      try {
        sessionStorage.setItem('numio_kid', JSON.stringify({ kidId, phase: 'diagnostic', pendingClaim, selectedTables }))
      } catch {}
    } else if (kidId && authPhase === 'onboarding') {
      try {
        sessionStorage.setItem('numio_kid', JSON.stringify({ kidId, phase: 'onboarding' }))
      } catch {}
    }
  }, [kidId, authPhase, navTab, screen, pendingClaim, selectedTables])

  // On first mount, check for a saved session and skip straight to the
  // kid picker if one exists — avoids forcing a returning parent to log
  // in again every single time they open the app.
  useEffect(() => {
    const saved = getSession()
    if (saved) {
      setParentId(saved)
      // Also restore kid session if available
      try {
        const kidSession = sessionStorage.getItem('numio_kid')
        if (kidSession) {
          const parsed = JSON.parse(kidSession)
          const { kidId: savedKidId, phase } = parsed
          if (savedKidId) {
            setKidId(savedKidId)
            setParentId(saved)
            if (phase === 'diagnostic') {
              if (parsed.pendingClaim) setPendingClaim(parsed.pendingClaim)
              if (parsed.selectedTables) setSelectedTables(parsed.selectedTables)
              setAuthPhase('diagnostic')
            } else if (phase === 'onboarding') {
              setAuthPhase('onboarding')
            } else {
              setNavTab(parsed.navTab || 'home')
              setScreen(parsed.screen === 'play' ? 'path' : (parsed.screen || 'list'))
              setAuthPhase('game')
            }
            return
          }
        }
      } catch {}
      setAuthPhase('kidPicker')
    } else {
      setAuthPhase('auth')
    }
  }, [])

  function handleAuthenticated(newParentId, isNewAccount = false) {
    setParentId(newParentId)
    if (isNewAccount) {
      // New account — go straight to create kid + onboarding, skip KidPicker
      setAuthPhase('createKid')
    } else {
      setAuthPhase('kidPicker')
    }
  }

  function handleSelectKid(selectedKidId) {
    setKidId(selectedKidId)
    setAuthPhase('game')
    setNavTab('home')
    setScreen('list')
  }

  function handleKidCreated(newKidId) {
    setKidId(newKidId)
    setOnboardingStartStep(0)
    setOnboardingKidName('')
    setOnboardingKidAge('')
    setAuthPhase('onboarding')
  }

  function handleDiagnosticPass() {
    // Cursor already set to claimed chapter by Diagnostic.jsx; go straight to game.
    setPendingClaim(null)
    setAuthPhase('game')
    setNavTab('home')
    setScreen('list')
  }

  function handleDiagnosticFail() {
    // Cursor stays at addition/table1/batch1/learn (the default from createKid).
    setPendingClaim(null)
    setAuthPhase('game')
    setNavTab('home')
    setScreen('list')
  }

  function handleLogOut() {
    authLogOut()
    try { sessionStorage.removeItem('numio_kid') } catch {}
    setParentId(null)
    setKidId(null)
    setAuthPhase('auth')
  }

  function handleSwitchProfile() {
    try { sessionStorage.removeItem('numio_kid') } catch {}
    setKidId(null)
    setAuthPhase('kidPicker')
    setRefreshKey(k => k + 1)
  }

  function handleNavigate(tab) {
    setNavTab(tab)
    if (tab === 'home') {
      setScreen('list')
      setActiveChapter(null)
      setActiveNode(null)
    }
  }

  function handleOpenChapter(operation) {
    setActiveChapter(operation)
    setScreen('path')
  }

  function handleStartNode(nodeConfig) {
    setActiveNode(nodeConfig)
    setScreen('play')
  }

  async function handleExitPractice(completedNode, table, batchNum) {
    // null = quit midway (X button) → no streak slide, just back to path
    if (completedNode === null) {
      setActiveNode(null)
      setScreen('path')
      setRefreshKey(k => k + 1)
      return
    }

    trackEvent('node_completed', {
      operation: activeNode?.operation,
      table,
      batch: batchNum,
      node: completedNode,
    })
    if (completedNode === 'review') {
      trackEvent('unit_completed', {
        operation: activeNode?.operation,
        table,
        batch: batchNum,
      })
    }

    const isVeryFirstUnit = table === 1 && batchNum === 1 && activeNode?.operation === 'addition'
    const shouldShowStreak =
      (isVeryFirstUnit && completedNode === 'review') ||       // Day 1 — after Review
      (!isVeryFirstUnit && completedNode === 'welcome') ||     // Day 2+ — after Welcome
      (!isVeryFirstUnit && completedNode === 'review')         // Day 2+ — after Review too

    if (shouldShowStreak) {
      try {
        // For Day 1 Review, streak is always 1 — no need to query DB
        // (the attempt was just written and may not be committed yet)
        if (isVeryFirstUnit && completedNode === 'review') {
          setStreakCount(1)
        } else {
          const { fetchStreak } = await import('./lib/kidData')
          await new Promise(r => setTimeout(r, 500))
          const streak = await fetchStreak(kidId)
          setStreakCount(Math.max(1, streak))
        }
      } catch {
        setStreakCount(1)
      }
      // Set the right trigger so StreakSlide shows correct messaging + circles
      if (isVeryFirstUnit && completedNode === 'review') {
        setStreakTrigger('review_day1')
      } else if (completedNode === 'review') {
        setStreakTrigger('review')
      } else {
        setStreakTrigger('welcome')
      }
      setShowStreakSlide(true)
    } else {
      setActiveNode(null)
      setScreen('path')
      setRefreshKey(k => k + 1)
    }
  }

  function handleBackToList() {
    setActiveChapter(null)
    setScreen('list')
    setRefreshKey(k => k + 1)
  }

  // ── Pre-game phases ──────────────────────────────────────────────────

  if (authPhase === 'checking') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Loading…</p>
      </div>
    )
  }

  if (authPhase === 'auth') {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  if (authPhase === 'kidPicker') {
    return (
      <KidPicker
        key={refreshKey}
        parentId={parentId}
        onSelectKid={handleSelectKid}
        onCreateKid={() => setAuthPhase('createKid')}
        onLogOut={handleLogOut}
      />
    )
  }

  if (authPhase === 'createKid') {
    return (
      <CreateKid
        parentId={parentId}
        onCreated={handleKidCreated}
        onBack={() => setAuthPhase('kidPicker')}
      />
    )
  }

  if (authPhase === 'onboarding') {
    return (
      <ChildOnboarding
        kidId={kidId}
        parentId={parentId}
        startStep={onboardingStartStep}
        savedName={onboardingKidName}
        savedAge={onboardingKidAge}
        onDone={async ({ justStarting, knownOps, tablesByOp, goToDiagnostic, kidName, kidAge }) => {
          if (kidName) setOnboardingKidName(kidName)
          if (kidAge) setOnboardingKidAge(kidAge)
          if (justStarting || !goToDiagnostic) {
            // Just starting out or no diagnostic needed — go straight to game
            setAuthPhase('game')
            setNavTab('home')
            setScreen('list')
          } else {
            // They know some math — set up diagnostic
            const claimOp = knownOps[knownOps.length - 1]
            const tables = tablesByOp[claimOp] || []
            setPendingClaim(claimOp)
            setSelectedTables(tables)
            try {
              const { updatePlacementClaim } = await import('./lib/kidData')
              await updatePlacementClaim(kidId, claimOp)
            } catch (err) { console.error('Failed to save placement claim:', err) }
            setAuthPhase('diagnostic')
          }
        }}
      />
    )
  }

  if (authPhase === 'diagnostic') {
    return (
      <Diagnostic
        kidId={kidId}
        claimedOperation={pendingClaim}
        selectedTables={selectedTables}
        onPass={handleDiagnosticPass}
        onFail={handleDiagnosticFail}
        onPickLevel={() => { setOnboardingStartStep(6); setAuthPhase('onboarding') }}
      />
    )
  }

  // ── Streak slide (after Welcome) ────────────────────────────────────────
  if (showStreakSlide) {
    return (
      <StreakSlide
        dayStreak={streakCount}
        trigger={streakTrigger}
        onContinue={() => {
          setShowStreakSlide(false)
          setActiveNode(null)
          setScreen('path')
          setRefreshKey(k => k + 1)
        }}
      />
    )
  }

  // ── Game phase ───────────────────────────────────────────────────────

  if (navTab === 'home' && screen === 'play' && activeNode) {
    // Day 1 of any chapter (batch 1, unlock node) → show chapter intro
    // instead of the unlock exercise (nothing to test yet on day 1).
    // isFirstEver = true only for the very first session (addition/table1/batch1)
    const isChapterDay1 = activeNode.node === 'welcome' && activeNode.batchNum === 1 && activeNode.table === 1
    if (isChapterDay1) {
      const isFirstEver = activeNode.operation === 'addition'
      return (
        <ChapterIntro
          key={`intro-${activeNode.operation}`}
          operation={activeNode.operation}
          table={activeNode.table}
          batchNum={activeNode.batchNum}
          node={activeNode.node}
          kidId={kidId}
          isFirstEver={isFirstEver}
          kidCurrentStep={activeNode.kidCurrentStep}
          onDone={handleExitPractice}
        />
      )
    }

    return (
      <Practice
        key={`${activeNode.operation}-${activeNode.table}-${activeNode.batchNum}-${activeNode.node}`}
        operation={activeNode.operation}
        table={activeNode.table}
        batchNum={activeNode.batchNum}
        node={activeNode.node}
        kidId={kidId}
        coinBalance={activeNode.coinBalance}
        reviewPool={activeNode.reviewPool}
        unlockBatch={activeNode.unlockBatch}
        placementClaim={activeNode.placementClaim}
        kidCurrentStep={activeNode.kidCurrentStep}
        onExit={(completedNode) => handleExitPractice(completedNode, activeNode.table, activeNode.batchNum)}
        onBalanceChange={(newBal) => setActiveNode(n => n ? { ...n, coinBalance: newBal } : n)}
      />
    )
  }

  let content
  if (navTab === 'rewards') {
    content = <Rewards kidId={kidId} parentId={parentId} onGoToParent={() => { setParentDashInitialTab('claims'); setShowParentPin(true) }} />
  } else if (navTab === 'profile') {
    content = <Profile kidId={kidId} onSwitchProfile={handleSwitchProfile} />
  } else if (screen === 'path' && activeChapter) {
    content = (
      <ChapterPath
        key={`${activeChapter}-${refreshKey}`}
        operation={activeChapter}
        kidId={kidId}
        parentId={parentId}
        onStartNode={handleStartNode}
        onBack={handleBackToList}
        onGoToParent={() => { setParentDashInitialTab('rewards'); setShowParentPin(true) }}
        onGoToRewards={() => { setNavTab('rewards') }}
      />
    )
  } else {
    content = <Map key={refreshKey} onOpenChapter={handleOpenChapter} kidId={kidId} />
  }

  // Parent zone overlays — shown on top of the game UI
  if (showParentPin) {
    return (
      <ParentPinEntry
        parentId={parentId}
        onSuccess={() => { setShowParentPin(false); setShowParentDash(true) }}
        onBack={() => { setShowParentPin(false); setParentDashInitialTab('kids') }}
      />
    )
  }

  if (showParentDash) {
    return (
      <ParentDashboard
        parentId={parentId}
        initialTab={parentDashInitialTab}
        onBack={() => { setShowParentDash(false); setParentDashInitialTab('kids') }}
        onAddKid={() => {
          setShowParentDash(false)
          setParentDashInitialTab('kids')
          setAuthPhase('createKid')
        }}
      />
    )
  }

  return (
    <NavShell active={navTab} onNavigate={handleNavigate} onParentZone={() => { setParentDashInitialTab('kids'); setShowParentPin(true) }}>
      {content}
    </NavShell>
  )
}
