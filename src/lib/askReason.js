// Promise-based "type a reason" sheet: `const reason = await askReason({ title, message }); if (!reason) return;`
// Drawn once by <ReasonHost /> (mounted in App next to ConfirmHost). Resolves null when cancelled.
let listener = null;
let pending = null;

export function askReason({ title, message, confirmLabel, placeholder } = {}) {
  return new Promise((resolve) => {
    if (!listener) { resolve(null); return; }
    if (pending) pending.resolve(null);
    pending = { title, message: String(message ?? ""), confirmLabel, placeholder, resolve };
    listener(pending);
  });
}

export function subscribeReason(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

export function settleReason(request, answer) {
  if (pending === request) pending = null;
  request.resolve(answer);
}
