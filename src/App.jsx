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
import Onboarding from './screens/Onboarding'
import LevelSelect from './screens/LevelSelect'
import TablePicker from './screens/TablePicker'
import TestIntro from './screens/TestIntro'
import ParentPinEntry from './screens/ParentPinEntry'
import ParentDashboard from './screens/ParentDashboard'
import StreakSlide from './screens/StreakSlide'
import NavShell from './components/NavShell'
import { getSession, logOut as authLogOut } from './lib/parentAuth'

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

  // Game-level navigation state (only meaningful once authPhase === 'game')
  const [navTab, setNavTab] = useState('home') // 'home' | 'rewards' | 'profile'
  const [screen, setScreen] = useState('list')       // 'list' | 'path' | 'play'
  const [activeChapter, setActiveChapter] = useState(null)
  const [activeNode, setActiveNode] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showStreakSlide, setShowStreakSlide] = useState(false)
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
              // Restore to diagnostic — questions regenerated fresh but kid stays in flow
              if (parsed.pendingClaim) setPendingClaim(parsed.pendingClaim)
              if (parsed.selectedTables) setSelectedTables(parsed.selectedTables)
              setAuthPhase('diagnostic')
            } else {
              // Restore to game — if was mid-play, go back to path safely
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

  function handleAuthenticated(newParentId) {
    setParentId(newParentId)
    setAuthPhase('kidPicker')
  }

  function handleSelectKid(selectedKidId) {
    setKidId(selectedKidId)
    setAuthPhase('game')
    setNavTab('home')
    setScreen('list')
  }

  function handleKidCreated(newKidId, placementClaim) {
    setKidId(newKidId)
    // Always show onboarding first — every new kid sees it.
    // Store placement claim so we know what to do after onboarding.
    if (placementClaim) setPendingClaim(placementClaim)
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

    const isVeryFirstUnit = table === 1 && batchNum === 1
    const shouldShowStreak =
      (isVeryFirstUnit && completedNode === 'review') ||       // Day 1 — after Review
      (!isVeryFirstUnit && completedNode === 'welcome') ||     // Day 2+ — after Welcome
      (!isVeryFirstUnit && completedNode === 'review')         // Day 2+ — after Review too

    if (shouldShowStreak) {
      try {
        const { fetchStreak } = await import('./lib/kidData')
        // Small delay to ensure the attempt DB write from Practice.jsx
        // finalizeAttempt() has committed before we query the streak count
        await new Promise(r => setTimeout(r, 500))
        const streak = await fetchStreak(kidId)
        setStreakCount(Math.max(0, streak))
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
      <Onboarding
        onDone={() => setAuthPhase('levelSelect')}
      />
    )
  }

  if (authPhase === 'levelSelect') {
    return (
      <LevelSelect
        onBack={() => setAuthPhase('onboarding')}
        onDone={async (claim) => {
          if (claim) {
            setPendingClaim(claim)
            // Persist the claim to DB so passThresholdFor works correctly
            if (kidId) {
              try {
                const { updatePlacementClaim } = await import('./lib/kidData')
                await updatePlacementClaim(kidId, claim)
              } catch (err) { console.error('Failed to save placement claim:', err) }
            }
            setAuthPhase('tablePicker')
          } else {
            setAuthPhase('game')
            setNavTab('home')
            setScreen('list')
          }
        }}
      />
    )
  }

  if (authPhase === 'tablePicker') {
    return (
      <TablePicker
        operation={pendingClaim}
        onBack={() => setAuthPhase('levelSelect')}
        onDone={(tables) => {
          setSelectedTables(tables)
          setAuthPhase('testIntro')
        }}
      />
    )
  }

  if (authPhase === 'testIntro') {
    return (
      <TestIntro
        onBack={() => setAuthPhase('tablePicker')}
        onStart={() => setAuthPhase('diagnostic')}
        onSkip={() => {
          setAuthPhase('game')
          setNavTab('home')
          setScreen('list')
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
    content = <Rewards kidId={kidId} parentId={parentId} />
  } else if (navTab === 'profile') {
    content = <Profile kidId={kidId} onSwitchProfile={handleSwitchProfile} />
  } else if (screen === 'path' && activeChapter) {
    content = (
      <ChapterPath
        key={`${activeChapter}-${refreshKey}`}
        operation={activeChapter}
        kidId={kidId}
        onStartNode={handleStartNode}
        onBack={handleBackToList}
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
        onBack={() => setShowParentPin(false)}
      />
    )
  }

  if (showParentDash) {
    return (
      <ParentDashboard
        parentId={parentId}
        onBack={() => setShowParentDash(false)}
        onAddKid={() => {
          setShowParentDash(false)
          setAuthPhase('createKid')
        }}
      />
    )
  }

  return (
    <NavShell active={navTab} onNavigate={handleNavigate} onParentZone={() => setShowParentPin(true)}>
      {content}
    </NavShell>
  )
}
