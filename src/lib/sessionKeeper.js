import { ensureFreshSession } from '@/lib/supabaseClient';

// Keeps a signed-in user's session alive for as long as the app is open, so it never "goes quiet":
//   - Access tokens last about an hour. A background tab or a sleeping laptop stops the normal refresh
//     timer, so the token can expire while nobody is looking. Once it has, every request is treated as
//     anonymous and the database (row-level security) answers with EMPTY lists and no error — which is how
//     "no events found" used to appear, until the app finally noticed and logged the user out.
//   - This refreshes the token a few minutes before it expires, whenever the tab becomes visible again,
//     and whenever the network comes back — and tells the app (once) if the login is really gone, so it
//     can sign the user out cleanly instead of showing an empty app.
// A temporary network problem is never treated as a logout: it just tries again later.

export const SESSION_RECOVERED_EVENT = 'kramasha:session-recovered';
export const SESSION_EXPIRED_KEY = 'kramasha_session_expired';

const CHECK_EVERY_MS = 45 * 1000;
// After the tab has been hidden this long, assume data may have been fetched with a dead token.
const STALE_AFTER_HIDDEN_MS = 60 * 1000;

export function startSessionKeeper({ onLost } = {}) {
  let stopped = false;
  let lost = false;
  let degraded = false;     // last attempt failed for network reasons
  let hiddenAt = 0;

  const announceRecovered = () => window.dispatchEvent(new Event(SESSION_RECOVERED_EVENT));

  const check = async ({ force = false, afterLongAbsence = false } = {}) => {
    if (stopped || lost) return;
    if (!force && document.visibilityState === 'hidden') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { degraded = true; return; }

    const result = await ensureFreshSession();
    if (stopped) return;

    if (result.ok) {
      // Pages that loaded while the token was dead may be showing empty data: have them reload.
      if (degraded || afterLongAbsence) announceRecovered();
      degraded = false;
      return;
    }
    if (result.reason === 'network') { degraded = true; return; }

    lost = true;
    // Say WHY in the console, so "your session expired" can be traced to a real cause (rejected refresh token,
    // nothing stored to refresh from…) instead of guessed at.
    console.warn('[Kramasha] Session ended by the session keeper:', result.reason, result.error?.message || result.error?.code || '');
    try { sessionStorage.setItem(SESSION_EXPIRED_KEY, '1'); } catch { /* noop */ }
    onLost?.(result.reason);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    check({ afterLongAbsence: away > STALE_AFTER_HIDDEN_MS });
  };
  const onOnline = () => check({ force: true });

  const timer = setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onVisibility);
  check();

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onVisibility);
  };
}
