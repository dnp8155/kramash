// Promise-based replacement for window.confirm: `if (!(await askConfirm("Delete this?"))) return;`
// The sheet itself is drawn once by <ConfirmHost /> (mounted in App), so it matches the rest of the app's dialogs.
let listener = null;
let pending = null;

// Wording that should make the confirm button red.
const DESTRUCTIVE = /\b(delete|remove|disable|void|reset|replace|cancel|permanently|discard)\b/i;

export function askConfirm(message, { title, confirmLabel, cancelLabel, destructive } = {}) {
  return new Promise((resolve) => {
    if (!listener) { resolve(false); return; }
    // A second request while one is open cancels the first.
    if (pending) pending.resolve(false);
    pending = {
      message: String(message ?? ""),
      title,
      confirmLabel,
      cancelLabel,
      destructive: destructive ?? DESTRUCTIVE.test(String(message ?? "")),
      resolve,
    };
    listener(pending);
  });
}

export function subscribeConfirm(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

export function settleConfirm(request, answer) {
  if (pending === request) pending = null;
  request.resolve(answer);
}
