import { supabase } from './supabaseClient'
import { hashPin, hashPinWithSalt } from './pinAuth'

// ── Session persistence ──────────────────────────────────────────────────
const SESSION_KEY = 'tenaday_parent_id'

export function saveSession(parentId) {
  try { localStorage.setItem(SESSION_KEY, parentId) } catch (err) {
    console.error('Failed to persist session (login still succeeded):', err)
  }
}

export function getSession() {
  try { return localStorage.getItem(SESSION_KEY) } catch { return null }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

// ── Phone number normalization ──────────────────────────────────────────
export function normalizePhone(raw) {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digitsOnly}` : digitsOnly
}

// ── Auth errors ──────────────────────────────────────────────────────────
export class AuthError extends Error {}

// ── Parent signup ────────────────────────────────────────────────────────
// PIN hashing still happens client-side (PBKDF2 via WebCrypto).
// The resulting hash is sent to the server-side RPC — the anon key
// never reads the parents table directly anymore.

export async function signUp(phoneRaw, pin) {
  const phone = normalizePhone(phoneRaw)
  if (phone.length < 7) throw new AuthError('Enter a valid phone number.')
  if (!/^\d{4}$/.test(pin)) throw new AuthError('PIN must be exactly 4 digits.')

  const pinHash = await hashPin(pin)

  const { data, error } = await supabase.rpc('parent_sign_up', {
    p_phone: phone,
    p_pin_hash: pinHash,
  })

  if (error) {
    if (error.message?.includes('PHONE_EXISTS')) {
      throw new AuthError('An account with this phone number already exists. Try logging in instead.')
    }
    throw error
  }

  saveSession(data)
  return data
}

// ── Parent login ─────────────────────────────────────────────────────────
// To verify the PIN server-side without sending the raw PIN over the wire,
// we need the stored salt to recompute the PBKDF2 hash client-side first.
// Step 1: fetch only the salt (not the full hash) via a safe RPC.
// Step 2: recompute the hash client-side using the salt.
// Step 3: send the computed hash to the server for comparison.
// The full pin_hash never leaves the server — anon key can't read parents table.

export async function logIn(phoneRaw, pin) {
  const phone = normalizePhone(phoneRaw)

  // Step 1: get salt for this phone (safe — returns fake salt if phone not found)
  const { data: saltHex, error: saltError } = await supabase.rpc('get_parent_salt', {
    p_phone: phone,
  })
  if (saltError) throw saltError

  // Step 2: recompute hash client-side using the stored salt
  const pinHash = await hashPinWithSalt(pin, saltHex)

  // Step 3: verify server-side — returns parent_id or null
  const { data: parentId, error: loginError } = await supabase.rpc('parent_log_in', {
    p_phone: phone,
    p_pin_hash: pinHash,
  })
  if (loginError) throw loginError

  if (!parentId) {
    throw new AuthError('Incorrect phone number or PIN.')
  }

  saveSession(parentId)
  return parentId
}

export function logOut() {
  clearSession()
}

// ── Kid profile CRUD ─────────────────────────────────────────────────────
export async function listKidsForParent(parentId) {
  const { data, error } = await supabase
    .from('kids')
    .select('id, name, age, coin_balance, current_operation, current_table')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createKid(parentId, { name, age, placementClaim, timezone }) {
  if (!name || !name.trim()) throw new AuthError('Enter a name for your kid.')

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
      current_node: 'welcome',
      coin_balance: 50,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
