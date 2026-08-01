// Numio — with Sentry error monitoring
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize Sentry for error monitoring
// Using window.Sentry loaded via CDN in index.html
function initSentry() {
  try {
    if (window.Sentry) {
      window.Sentry.init({
        dsn: 'https://f02200cc274438fc4f38612c98e853c9@o4511837282500608.ingest.us.sentry.io/4511837308125184',
        environment: 'production',
        beforeSend(event) {
          if (event.user) delete event.user
          return event
        },
      })
    }
  } catch (e) { console.error('Sentry init failed:', e) }
}
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
