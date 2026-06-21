// ── PIN hashing ──────────────────────────────────────────────────────────
// A 4-digit PIN has only 10,000 possible values — far too small a keyspace
// for a fast hash like plain SHA-256 to meaningfully protect (an attacker
// with the hash could brute-force all 10,000 combinations near-instantly).
// PBKDF2 with a high iteration count is deliberately SLOW, which is the
// actual defense here: it doesn't make the PIN itself stronger, but it
// makes checking each of the 10,000 guesses cost real time, turning a
// trivial brute force into an impractical one.
//
// Uses the browser's native Web Crypto API (crypto.subtle) — available in
// every modern browser, zero external dependencies, no bundle-size cost.
//
// IMPORTANT CAVEAT: this hashing happens CLIENT-SIDE, in the browser, not
// on a server Anthropic/this app controls. That's a real architectural
// limitation worth being explicit about: a sufficiently motivated attacker
// who can read the client-side JS (anyone can, it's a web app) knows
// exactly how the hash is computed, even though they still can't reverse
// a specific hash back into its PIN without brute-forcing it. This is an
// accepted trade-off for "no backend server beyond Supabase" — the
// alternative (hashing inside a Supabase Edge Function) is a stronger
// design and worth migrating to before this app handles a real child's
// data at scale, but is out of scope for the current build phase.

const ITERATIONS = 100_000 // deliberately high; ~100-300ms on typical phone hardware
const SALT_BYTES = 16
const HASH_BITS = 256

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

async function pbkdf2(pin, saltBytes) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS
  )
  return bufferToHex(derivedBits)
}

/** Hashes a PIN for storage. Returns a single string combining the salt
 *  and hash (format: "pbkdf2$<saltHex>$<hashHex>"), since both need to be
 *  stored together — the salt isn't secret, it just needs to be unique
 *  per-PIN so two parents with the same PIN don't produce the same hash. */
export async function hashPin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits')
  }
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hashHex = await pbkdf2(pin, saltBytes)
  return `pbkdf2$${bufferToHex(saltBytes)}$${hashHex}`
}

/** Verifies a PIN attempt against a stored hash. Recomputes the hash using
 *  the SAME salt that was stored, then compares — never decrypts/reverses
 *  the stored hash, since that's not how PBKDF2 works (it's one-way). */
export async function verifyPin(pin, storedHash) {
  if (!/^\d{4}$/.test(pin)) return false
  const parts = storedHash.split('$')
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false

  const [, saltHex, expectedHashHex] = parts
  const saltBytes = hexToBuffer(saltHex)
  const actualHashHex = await pbkdf2(pin, saltBytes)

  // Constant-time-ish comparison: still compares the full string rather
  // than short-circuiting on first mismatch via something like ===, which
  // matters less here than in a high-value server-side auth system, but
  // costs nothing to do properly.
  if (actualHashHex.length !== expectedHashHex.length) return false
  let diff = 0
  for (let i = 0; i < actualHashHex.length; i++) {
    diff |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i)
  }
  return diff === 0
}
