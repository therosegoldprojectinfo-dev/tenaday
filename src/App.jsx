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
import ParentPinEntry from './screens/ParentPinEntry'
import ParentDashboard from './screens/ParentDashboard'
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
  const [showParentPin, setShowParentPin]   = useState(false)
  const [showParentDash, setShowParentDash] = useState(false)

  // Game-level navigation state (only meaningful once authPhase === 'game')
  const [navTab, setNavTab] = useState('home') // 'home' | 'rewards' | 'profile'
  const [screen, setScreen] = useState('list')       // 'list' | 'path' | 'play'
  const [activeChapter, setActiveChapter] = useState(null)
  const [activeNode, setActiveNode] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // On first mount, check for a saved session and skip straight to the
  // kid picker if one exists — avoids forcing a returning parent to log
  // in again every single time they open the app.
  useEffect(() => {
    const saved = getSession()
    if (saved) {
      setParentId(saved)
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
    setParentId(null)
    setKidId(null)
    setAuthPhase('auth')
  }

  function handleSwitchProfile() {
    setKidId(null)
    setAuthPhase('kidPicker')
    // Bumping refreshKey forces KidPicker to remount and re-fetch the
    // kid list, so any changes (coin balance, progress) made during this
    // session show up immediately rather than a stale snapshot from
    // whenever the picker last loaded.
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

  function handleExitPractice() {
    setActiveNode(null)
    setScreen('path')
    setRefreshKey(k => k + 1)
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
        onDone={() => {
          if (pendingClaim) {
            setAuthPhase('diagnostic')
          } else {
            setAuthPhase('game')
            setNavTab('home')
            setScreen('list')
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
        onPass={handleDiagnosticPass}
        onFail={handleDiagnosticFail}
      />
    )
  }

  // ── Game phase ───────────────────────────────────────────────────────

  if (navTab === 'home' && screen === 'play' && activeNode) {
    // Day 1 of any chapter (batch 1, unlock node) → show chapter intro
    // instead of the unlock exercise (nothing to test yet on day 1).
    // isFirstEver = true only for the very first session (addition/table1/batch1)
    const isChapterDay1 = activeNode.node === 'unlock' && activeNode.batchNum === 1 && activeNode.table === 1
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
        heartBalance={activeNode.heartBalance}
        reviewPool={activeNode.reviewPool}
        unlockBatch={activeNode.unlockBatch}
        placementClaim={activeNode.placementClaim}
        onExit={handleExitPractice}
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
