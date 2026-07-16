import { supabase } from './supabaseClient'

// Thin wrapper around the log_event Supabase RPC (see
// supabase/analytics_schema.sql). Writes to our own analytics_events
// table instead of a third-party analytics vendor — same reasoning as
// every other write in this app: server-side via RPC, never a raw insert
// from the client.
//
// Fire-and-forget: never awaited by callers, and any failure (network
// blip, RLS issue, etc.) is swallowed after logging to console — a
// tracking failure must never break the actual app flow (signup, node
// completion, reward redemption, etc.) it's attached to.
//
// name must be one of the 7 event names allowed by analytics_events'
// check constraint: signup_completed, child_created, reward_created,
// unit_started, unit_completed, reward_unlocked, reward_redeemed.
export function trackEvent(name, { parentId = null, kidId = null, ...props } = {}) {
  supabase
    .rpc('log_event', {
      p_event_name: name,
      p_parent_id: parentId,
      p_kid_id: kidId,
      p_props: props,
    })
    .then(({ error }) => {
      if (error) console.error('Analytics log_event failed:', name, error)
    })
}
