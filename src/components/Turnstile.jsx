import { useEffect, useRef } from 'react'

// Thin wrapper around Cloudflare Turnstile (loaded via the <script> tag in
// index.html). Renders the widget into a div and calls onVerify(token)
// once a person passes the challenge — usually invisible or a single
// checkbox, not an image puzzle. That token then gets passed through to
// supabase.auth.signInAnonymously({ options: { captchaToken } }), which
// Supabase's own "Enable CAPTCHA protection" setting checks server-side.
//
// Requires VITE_TURNSTILE_SITE_KEY in .env (the public Sitekey from
// Cloudflare's dashboard — safe to expose client-side, same as the
// Supabase anon key).
export default function Turnstile({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let pollInterval = null

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return
      // Guard against ever rendering a second widget into the same
      // container — this is what was previously missing, and it's what
      // caused "Cannot find Widget" + cascading 600010 errors whenever
      // the component re-mounted before the async script had finished
      // loading on the first mount.
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        callback: (token) => onVerify?.(token),
        'expired-callback': () => onExpire?.(),
        'error-callback': () => onExpire?.(),
      })
    }

    // The script tag loads async, so window.turnstile may not exist yet
    // on first render — poll briefly until it's ready.
    if (window.turnstile) {
      renderWidget()
    } else {
      pollInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollInterval)
          pollInterval = null
          renderWidget()
        }
      }, 100)
    }

    // ONE cleanup path, always registered, regardless of which branch
    // above actually rendered the widget. Previously the "still waiting
    // for the script" branch returned its own early cleanup that only
    // cleared the interval — never removing the widget itself once it
    // eventually rendered — which is exactly the bug that caused this.
    return () => {
      cancelled = true
      if (pollInterval) clearInterval(pollInterval)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }} />
}
