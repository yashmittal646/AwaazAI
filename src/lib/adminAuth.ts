/* ─── Admin Auth helpers ─────────────────────────────────────────────
   Simple client-side admin gate. Password is checked locally; the
   session flag lives in sessionStorage so it clears on tab close.
   ─────────────────────────────────────────────────────────────────── */

const ADMIN_KEY   = "Awaaz_admin_session";
const ADMIN_PASS  = "Admin@6081";

/** Returns true if the current tab has an active admin session */
export function isAdminSession(): boolean {
  return sessionStorage.getItem(ADMIN_KEY) === "1";
}

/** Validates password and, if correct, writes the session flag */
export function tryAdminLogin(password: string): boolean {
  if (password === ADMIN_PASS) {
    sessionStorage.setItem(ADMIN_KEY, "1");
    return true;
  }
  return false;
}

/** Clears the admin session */
export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_KEY);
}
