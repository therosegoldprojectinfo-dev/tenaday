// Fires a "virtual pageview" to Google Analytics — since Numio is a
// single-page app, Auth/onboarding/gameplay all share the same real URL,
// so GA's automatic pageview alone can't tell them apart. This sends an
// explicit page_view event with a distinct virtual path/title for each
// stage, so the "Pages and screens" report in GA can show a real funnel:
// landing page -> Auth -> onboarding -> playing.
//
// Deliberately basic — just page views, no click/scroll/behavioral detail
// (Enhanced Measurement is off), consistent with keeping tracking light
// on the actual app, not just the marketing landing page.
export function trackPageView(path, title) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  })
}
