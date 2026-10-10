// Unread count on the installed app's icon (home screen / dock), via the Badging API.
// Supported by installed PWAs on Android, Windows, macOS and iOS 16.4+; silently does nothing elsewhere.
export function setAppBadgeCount(count) {
  try {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n > 0) navigator.setAppBadge?.(n)?.catch?.(() => {});
    else (navigator.clearAppBadge?.() ?? navigator.setAppBadge?.(0))?.catch?.(() => {});
  } catch { /* badge is a nicety — never break the app for it */ }
}

export function clearAppBadge() {
  setAppBadgeCount(0);
}
