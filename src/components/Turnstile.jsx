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

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile) return
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
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval)
          renderWidget()
        }
      }, 100)
      return () => { cancelled = true; clearInterval(interval) }
    }

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }} />
}
