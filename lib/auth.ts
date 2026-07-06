import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "life_os_session";

// Fixed id the 0008 migration assigns all pre-profiles data to.
export const OWNER_USER_ID = "00000000-0000-0000-0000-000000000001";

// Fail closed. An unset/weak AUTH_SECRET used to silently fall back to "" —
// that made the owner session token publicly computable, so anyone could forge
// the cookie and get full access. Refuse to run without a real secret.
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need at least 16 chars). Set it in your environment (e.g. Vercel project env vars)."
    );
  }
  return s;
}

// Constant-time compare for callers outside this module (e.g. CRON_SECRET).
export function constantTimeEqual(a: string, b: string) {
  return safeEqual(a, b);
}

// Constant-time string compare — no timing side-channel on secrets/tokens.
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// --- Password storage: salted scrypt. Slow + per-user salt, so a DB leak
// can't be brute-forced fast and identical passwords don't collide.
// Format stored in passcode_hash: "scrypt$<saltHex>$<hashHex>". ---
export function hashPasscode(passcode: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(`${passcode}:${secret()}`, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyScrypt(input: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const derived = scryptSync(`${input}:${secret()}`, Buffer.from(saltHex, "hex"), 64);
  return safeEqual(derived.toString("hex"), hashHex);
}

// Legacy deterministic hash — kept only to honour pre-scrypt accounts and old
// owner cookies. Not used for new passwords.
function legacyHash(passcode: string) {
  return createHash("sha256").update(`${passcode}:${secret()}`).digest("hex");
}

// Pre-profiles cookie value — still honoured so already-logged-in devices
// stay signed in as the owner after the multi-user migration.
export function legacySessionToken() {
  return legacyHash(process.env.APP_PASSCODE || "");
}

// Keyed signature over the userId (secret acts as the key/pepper).
function signUserId(userId: string) {
  return createHash("sha256").update(`session:${userId}:${secret()}`).digest("hex");
}

export function sessionTokenFor(userId: string) {
  return `${userId}.${signUserId(userId)}`;
}

// Session token -> userId, or null if the token is missing/forged.
export function userIdFromToken(token: string | undefined) {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return safeEqual(token, legacySessionToken()) ? OWNER_USER_ID : null;
  const userId = token.slice(0, dot);
  return safeEqual(token.slice(dot + 1), signUserId(userId)) ? userId : null;
}

// The owner row keeps the sentinel hash 'env': its passcode lives in
// APP_PASSCODE rather than the database, so the original login keeps working.
export function verifyPasscode(input: string, storedHash: string) {
  if (storedHash === "env") {
    const pass = process.env.APP_PASSCODE;
    return Boolean(pass) && safeEqual(input, pass as string);
  }
  if (storedHash.startsWith("scrypt$")) return verifyScrypt(input, storedHash);
  // Legacy plain sha256 hex accounts.
  return safeEqual(legacyHash(input), storedHash);
}
