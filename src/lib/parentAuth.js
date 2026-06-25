import { supabase } from './supabaseClient'
import { hashPin, verifyPin } from './pinAuth'

// ── Session persistence ──────────────────────────────────────────────────
// This is the real deployed app (not a Claude.ai artifact), so plain
// localStorage is the correct, normal tool here — artifacts specifically
// can't use it, but a standalone Vite/React app has no such restriction.
// Stores only the parent's id (not the PIN, not the hash) — session
// "security" here is intentionally light: this app has no sensitive data
// beyond a kid's math progress, and the actual PIN check already happened
// once at login. Re-authenticating on every page load would be bad UX for
// a kid's app that may stay open on a shared family tablet for weeks.

const SESSION_KEY = 'tenaday_parent_id'

export function saveSession(parentId) {
  try {
    localStorage.setItem(SESSION_KEY, parentId)
  } catch (err) {
    // localStorage can throw in rare cases (private browsing, storage
    // quota) — non-fatal, just means the parent has to log in again next
    // visit instead of staying signed in.
    console.error('Failed to persist session (login still succeeded):', err)
  }
}

export function getSession() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore — nothing meaningful to do if this fails
  }
}

// ── Phone number normalization ──────────────────────────────────────────
// Strips everything except digits and a leading +, so "555-123-4567",
// "(555) 123-4567", and "5551234567" all match the same stored value
// instead of silently creating duplicate accounts for the same person.

export function normalizePhone(raw) {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digitsOnly}` : digitsOnly
}

// ── Parent signup / login ───────────────────────────────────────────────

export class AuthError extends Error {}

/** Creates a new parent account. Throws AuthError with a user-facing
 *  message for expected failure cases (phone already registered, bad PIN
 *  format) — anything else (network/Supabase errors) throws the raw error
 *  so it isn't silently mislabeled as a validation problem. */
export async function signUp(phoneRaw, pin) {
  const phone = normalizePhone(phoneRaw)
  if (phone.length < 7) {
    throw new AuthError('Enter a valid phone number.')
  }
  if (!/^\d{4}$/.test(pin)) {
    throw new AuthError('PIN must be exactly 4 digits.')
  }

  const { data: existing, error: checkError } = await supabase
    .from('parents')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  if (checkError) throw checkError
  if (existing) {
    throw new AuthError('An account with this phone number already exists. Try logging in instead.')
  }

  const pinHash = await hashPin(pin)

  const { data, error } = await supabase
    .from('parents')
    .insert({ phone, pin_hash: pinHash })
    .select('id')
    .single()

  if (error) throw error

  saveSession(data.id)
  return data.id
}

/** Logs in an existing parent. Throws AuthError for wrong phone/PIN
 *  (intentionally the SAME generic message for "no such phone" and "wrong
 *  PIN" — distinguishing them would let an attacker enumerate which phone
 *  numbers have accounts). */
export async function logIn(phoneRaw, pin) {
  const phone = normalizePhone(phoneRaw)

  const { data, error } = await supabase
    .from('parents')
    .select('id, pin_hash')
    .eq('phone', phone)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new AuthError('Incorrect phone number or PIN.')
  }

  const valid = await verifyPin(pin, data.pin_hash)
  if (!valid) {
    throw new AuthError('Incorrect phone number or PIN.')
  }

  saveSession(data.id)
  return data.id
}

export function logOut() {
  clearSession()
}

// ── Kid profile CRUD ─────────────────────────────────────────────────────

/** Lists every kid profile belonging to a parent, for the Netflix-style
 *  "who's playing" picker. Ordered by creation date so new profiles
 *  appear at the end, not in a confusing random order. */
export async function listKidsForParent(parentId) {
  const { data, error } = await supabase
    .from('kids')
    .select('id, name, age, coin_balance, current_operation, current_table')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/** Creates a new kid profile under a parent. Every kid always starts at
 *  the very beginning of the ladder (Addition, table 1, node 'learn',
 *  Unlock skipped) regardless of placementClaim — see
 *  lib/progression.js's firstEverNode()/shouldSkipUnlock() docs for why
 *  this is a deliberate product decision, not a missing feature.
 *  placementClaim only affects the PASS THRESHOLD later (lib/economy.js),
 *  never where a kid starts playing. */
export async function createKid(parentId, { name, age, placementClaim, timezone }) {
  if (!name || !name.trim()) {
    throw new AuthError('Enter a name for your kid.')
  }

  const { data, error } = await supabase
    .from('kids')
    .insert({
      parent_id: parentId,
      name: name.trim(),
      age: age || null,
      placement_claim: placementClaim || null,
      timezone: timezone || 'America/Toronto',
      current_operation: 'addition',
      current_table: 1,
      current_batch: 1,
      current_node: 'learn',
      coin_balance: 50,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}
