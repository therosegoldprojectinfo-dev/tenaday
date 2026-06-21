import { useState } from 'react'
import Map from './screens/Map'
import ChapterPath from './screens/ChapterPath'
import Practice from './screens/Practice'
import { DEMO_KID_ID } from './lib/kidData'

// Three-level navigation:
//   'list'  — chapter card list (was the whole app before; now the top level)
//   'path'  — in-chapter unit/node path for ONE operation
//   'play'  — Practice screen for ONE specific node
export default function App() {
  // No parent/login flow yet (next build phase) — every screen operates on
  // one seeded demo kid. Swap this for the picked profile's id once a kid
  // profile picker exists; nothing else needs to change.
  const kidId = DEMO_KID_ID

  const [screen, setScreen] = useState('list')       // 'list' | 'path' | 'play'
  const [activeChapter, setActiveChapter] = useState(null) // operation string, while in 'path' or 'play'
  const [activeNode, setActiveNode] = useState(null)        // { operation, table, node, coinBalance }, while in 'play'

  // Bumped to force a fresh kid-data fetch whenever a screen we're
  // returning to should reflect updated progress/balance.
  const [refreshKey, setRefreshKey] = useState(0)

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

  if (screen === 'play' && activeNode) {
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

  if (screen === 'path' && activeChapter) {
    return (
      <ChapterPath
        key={`${activeChapter}-${refreshKey}`}
        operation={activeChapter}
        kidId={kidId}
        onStartNode={handleStartNode}
        onBack={handleBackToList}
      />
    )
  }

  return <Map key={refreshKey} onOpenChapter={handleOpenChapter} kidId={kidId} />
}
