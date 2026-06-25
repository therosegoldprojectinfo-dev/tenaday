import { supabase } from './supabaseClient'

/** Detect the kid's IANA timezone automatically from their device.
 *  Only called once on account/kid creation and saved to the DB. */
export function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Server-authoritative gate check.
 *  Returns true if the kid is allowed to start a new batch/unit.
 *  Never relies on the device clock. */
export async function canStartNewUnit(kidId) {
  const { data, error } = await supabase.rpc('can_start_new_unit', { kid_id: kidId })
  if (error) {
    console.error('canStartNewUnit RPC failed, defaulting to open:', error)
    return true // fail open so kids aren't permanently blocked by a network error
  }
  return data
}

/** Called when a kid completes a full unit (after the Review node passes).
 *  Stamps the server time and pre-calculates next midnight in their timezone.
 *  Returns the next_unlock_at timestamptz string. */
export async function completeUnit(kidId) {
  const { data, error } = await supabase.rpc('complete_unit', { kid_id: kidId })
  if (error) throw error
  return data
}

/** Human-readable countdown to next unlock.
 *  Pass next_unlock_at (ISO string from the DB).
 *  Returns e.g. "Come back in 4h 32m!" or null if already unlocked. */
export function countdownMessage(nextUnlockAt) {
  if (!nextUnlockAt) return null
  const now = Date.now()
  const unlockMs = new Date(nextUnlockAt).getTime()
  const diffMs = unlockMs - now
  if (diffMs <= 0) return null

  const totalMinutes = Math.ceil(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `Come back in ${minutes}m!`
  if (minutes === 0) return `Come back in ${hours}h!`
  return `Come back in ${hours}h ${minutes}m!`
}

/** Friendly message shown on the locked next-unit card. */
export function nextUnlockMessage(nextUnlockAt) {
  return countdownMessage(nextUnlockAt)
    ?? "You've finished today's unit! Come back tomorrow for more 🌟"
}
