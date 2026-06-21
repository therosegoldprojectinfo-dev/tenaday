import { useState } from 'react'
import Map from './screens/Map'
import ChapterPath from './screens/ChapterPath'
import Practice from './screens/Practice'
import Rewards from './screens/Rewards'
import Profile from './screens/Profile'
import NavShell from './components/NavShell'
import { DEMO_KID_ID } from './lib/kidData'

// Two layers of navigation:
//   navTab: 'home' | 'rewards' | 'profile' — which bottom-bar/sidebar
//     destination is active. Persists independently of the chapter
//     drill-down below, so switching to Rewards and back to Home returns
//     to the chapter list, not wherever you were in a chapter.
//   screen: 'list' | 'path' | 'play' — only meaningful while navTab is
//     'home'; this is the existing chapter-list -> chapter-path ->
//     practice drill-down.
export default function App() {
  // No parent/login flow yet (next build phase) — every screen operates on
  // one seeded demo kid. Swap this for the picked profile's id once a kid
  // profile picker exists; nothing else needs to change.
  const kidId = DEMO_KID_ID

  const [navTab, setNavTab] = useState('home') // 'home' | 'rewards' | 'profile'

  const [screen, setScreen] = useState('list')       // 'list' | 'path' | 'play'
  const [activeChapter, setActiveChapter] = useState(null) // operation string, while in 'path' or 'play'
  const [activeNode, setActiveNode] = useState(null)        // { operation, table, node, coinBalance }, while in 'play'

  // Bumped to force a fresh kid-data fetch whenever a screen we're
  // returning to should reflect updated progress/balance.
  const [refreshKey, setRefreshKey] = useState(0)

  function handleNavigate(tab) {
    setNavTab(tab)
    // Switching to Rewards/Profile and back to Home always lands back on
    // the chapter list, not mid-chapter — matches how a persistent nav
    // bar is expected to behave (it's a top-level destination switch, not
    // a "resume where I left off" action).
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

  // Practice renders standalone, with NO nav shell — full-focus mode,
  // per current scope (confirmed: nav only appears on Home + Chapter Path).
  if (navTab === 'home' && screen === 'play' && activeNode) {
    return (
      <Practice
        key={`${activeNode.operation}-${activeNode.table}-${activeNode.node}`}
        operation={activeNode.operation}
        table={activeNode.table}
        node={activeNode.node}
        kidId={kidId}
        coinBalance={activeNode.coinBalance}
        reviewPool={activeNode.reviewPool}
        onExit={handleExitPractice}
      />
    )
  }

  let content
  if (navTab === 'rewards') {
    content = <Rewards />
  } else if (navTab === 'profile') {
    content = <Profile />
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
