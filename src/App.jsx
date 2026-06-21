import { useState } from 'react'
import Map from './screens/Map'
import Practice from './screens/Practice'

export default function App() {
  const [screen, setScreen] = useState('map')

  if (screen === 'practice') {
    return (
      <Practice
        operation="addition"
        table={1}
        onExit={() => setScreen('map')}
      />
    )
  }

  return <Map onNodePress={() => setScreen('practice')} />
}
