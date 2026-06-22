import { useState, useEffect } from 'react'
import Map from './screens/Map'
import ChapterPath from './screens/ChapterPath'
import Practice from './screens/Practice'
import Rewards from './screens/Rewards'
import Profile from './screens/Profile'
import Auth from './screens/Auth'
import KidPicker from './screens/KidPicker'
import CreateKid from './screens/CreateKid'
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
  const [authPhase, setAuthPhase] = useState('checking') // 'checking' | 'auth' | 'kidPicker' | 'createKid' | 'game'
  const [parentId, setParentId] = useState(null)
  const [kidId, setKidId] = useState(null)

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

  function handleKidCreated(newKidId) {
    setKidId(newKidId)
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

  // ── Game phase ───────────────────────────────────────────────────────

  // Practice renders standalone, with NO nav shell — full-focus mode.
  if (navTab === 'home' && screen === 'play' && activeNode) {
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

  return (
    <NavShell active={navTab} onNavigate={handleNavigate}>
      {content}
    </NavShell>
  )
}
