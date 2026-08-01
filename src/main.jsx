import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

Sentry.init({
  dsn: 'https://f02200cc274438fc4f38612c98e853c9@o4511837282500608.ingest.us.sentry.io/4511837308125184',
  environment: 'production',
  // Don't send user PII to Sentry
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  // Only capture real errors, not noise
  sampleRate: 1.0,
  beforeSend(event) {
    // Strip any user identifiers before sending
    if (event.user) delete event.user
    return event
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
