import { createHash } from "crypto";

export const AUTH_COOKIE_NAME = "life_os_session";

// Fixed id the 0008 migration assigns all pre-profiles data to.
export const OWNER_USER_ID = "00000000-0000-0000-0000-000000000001";

const secret = () => process.env.AUTH_SECRET || "";

export function hashPasscode(passcode: string) {
  return createHash("sha256").update(`${passcode}:${secret()}`).digest("hex");
}

// Pre-profiles cookie value — still honoured so already-logged-in devices
// stay signed in as the owner after the multi-user migration.
export function legacySessionToken() {
  return hashPasscode(process.env.APP_PASSCODE || "");
}

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
  if (dot === -1) return token === legacySessionToken() ? OWNER_USER_ID : null;
  const userId = token.slice(0, dot);
  return token.slice(dot + 1) === signUserId(userId) ? userId : null;
}

// The owner row keeps the sentinel hash 'env': its passcode lives in
// APP_PASSCODE rather than the database, so the original login keeps working.
export function verifyPasscode(input: string, storedHash: string) {
  if (storedHash === "env") return input === process.env.APP_PASSCODE;
  return hashPasscode(input) === storedHash;
}
