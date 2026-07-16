import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PrivacyPolicy from './screens/PrivacyPolicy.jsx'
import TermsAndConditions from './screens/TermsAndConditions.jsx'
import { Analytics } from '@vercel/analytics/react'
import './index.css'

const path = window.location.pathname

let root

if (path === '/privacy') {
  root = <PrivacyPolicy onBack={() => window.location.href = '/'} />
} else if (path === '/terms') {
  root = <TermsAndConditions onBack={() => window.location.href = '/'} />
} else {
  root = <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {root}
    <Analytics />
  </React.StrictMode>
)
