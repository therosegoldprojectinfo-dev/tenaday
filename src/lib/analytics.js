import { track } from '@vercel/analytics'

// Thin wrapper around Vercel Analytics' custom event tracking.
// Wrapped in try/catch so a tracking failure (e.g. blocked by an ad
// blocker, or analytics not yet initialized) can never break app flow.
export function trackEvent(name, props) {
  try {
    track(name, props)
  } catch (err) {
    console.error('Analytics track failed:', name, err)
  }
}
