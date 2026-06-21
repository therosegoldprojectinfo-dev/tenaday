import { useState } from 'react'
import Map from './screens/Map'
import Practice from './screens/Practice'
import { DEMO_KID_ID } from './lib/kidData'

export default function App() {
  // No parent/login flow yet (next build phase) — every screen operates on
  // one seeded demo kid. Swap this for the picked profile's id once a kid
  // profile picker exists; nothing else needs to change.
  const kidId = DEMO_KID_ID

  // null = on the map. Otherwise: { operation, table, stage, coinBalance }
  const [activeStage, setActiveStage] = useState(null)
  // Bumped to force Map to re-fetch fresh kid data when returning from a
  // finished attempt (so the journey map reflects the new position/balance).
  const [mapRefreshKey, setMapRefreshKey] = useState(0)

  function handleStartStage(stageConfig) {
    setActiveStage(stageConfig)
  }

  function handleExitPractice() {
    setActiveStage(null)
    setMapRefreshKey(k => k + 1)
  }

  if (activeStage) {
    return (
      <Practice
        key={`${activeStage.operation}-${activeStage.table}-${activeStage.stage}`}
        operation={activeStage.operation}
        table={activeStage.table}
        stage={activeStage.stage}
        kidId={kidId}
        coinBalance={activeStage.coinBalance}
        onExit={handleExitPractice}
      />
    )
  }

  return <Map key={mapRefreshKey} onStartStage={handleStartStage} kidId={kidId} />
}
