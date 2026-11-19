// Web push subscription management.
// The actual sending (VAPID signing + payload encryption) has to stay
// server-side since it needs the VAPID private key — see the real Supabase
// Edge Functions this calls: getPushConfig, registerPushSubscription, and
// dispatchPushNotification (supabase/functions/*). This file is the missing
// client half that turns those into a working feature.
import { base44 } from "@/api/base44Client";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

function urlBase64ToUint8Array(base64String) {
  const cleanStr = base64String.trim().replace(/['"]/g, '');
  const padding = "=".repeat((4 - (cleanStr.length % 4)) % 4);
  const base64 = (cleanStr + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Remembers that push was switched on on THIS device, so the app may quietly renew its subscription later
// (a phone can renew or drop it on its own). Switching it off on this device removes the mark.
const DEVICE_ON_KEY = "kramasha_push_on_device";
const markDevice = (on) => { try { on ? localStorage.setItem(DEVICE_ON_KEY, "1") : localStorage.removeItem(DEVICE_ON_KEY); } catch { /* storage off */ } };
const deviceMarkedOn = () => { try { return localStorage.getItem(DEVICE_ON_KEY) === "1"; } catch { return false; } };

const sameKey = (buf, bytes) => {
  if (!buf || !bytes) return true; // can't tell: leave the subscription as it is
  const a = new Uint8Array(buf);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
};

// This device's current push subscription, or null if not subscribed.
export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Request notification permission, subscribe this device, and register the
// subscription with the server so dispatchPushNotification can reach it.
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported on this device/browser.");
  }

  // Already allowed: no need to ask again (and no prompt when the app renews a subscription on its own).
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site. Click the lock icon next to the address bar (or open your device settings), allow Notifications, then try again."
        : "Notification permission was not granted."
    );
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const { vapidPublicKey } = await base44.functions.invoke("getPushConfig", {});
  if (!vapidPublicKey) throw new Error("Push notifications aren't configured on the server yet.");
  const serverKey = urlBase64ToUint8Array(vapidPublicKey);

  // A subscription made with an older server key can never receive pushes again: replace it.
  if (subscription && !sameKey(subscription.options?.applicationServerKey, serverKey)) {
    try { await subscription.unsubscribe(); } catch { /* replaced below anyway */ }
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
  }

  await base44.functions.invoke("registerPushSubscription", { subscription: subscription.toJSON() });
  markDevice(true);
  return subscription;
}

// Called once when the app opens. If push is on for this device, makes sure the server has its CURRENT subscription:
// phones renew subscriptions on their own, the server drops ones that stopped working, and a changed server key makes
// old ones useless. Any of those used to stop pushes silently while Preferences still said "Enabled on this device".
// Never asks for permission and never subscribes a device where push wasn't switched on.
export async function refreshPushSubscription() {
  try {
    if (!isPushSupported() || Notification.permission !== "granted") return;
    const existing = await getPushSubscription();
    if (!existing && !deviceMarkedOn()) return;
    await enablePushNotifications();
  } catch { /* best effort: Preferences can still switch it on by hand */ }
}

// Unsubscribe this device and remove its subscription row server-side.
export async function disablePushNotifications() {
  markDevice(false);
  const subscription = await getPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try { await subscription.unsubscribe(); } catch { /* already gone locally */ }
  try {
    const rows = await base44.entities.PushSubscription.filter({ endpoint });
    await Promise.all((rows || []).map((row) => base44.entities.PushSubscription.delete(row.id)));
  } catch { /* best-effort — dispatchPushNotification also prunes dead endpoints */ }
}

// On sign-out: this device must stop getting the account's pushes (client names, amounts…), and its app icon
// number is cleared. Signing in again and switching push on subscribes it afresh.
export async function forgetPushOnThisDevice() {
  try { (navigator.clearAppBadge?.() ?? navigator.setAppBadge?.(0))?.catch?.(() => {}); } catch { /* unsupported */ }
  try {
    await Promise.race([disablePushNotifications(), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* never block signing out */ }
}

// Send a real push to the current user's own subscribed devices, so they can
// verify delivery end-to-end from the settings screen.
export async function sendTestPushNotification(userId) {
  return base44.functions.invoke("dispatchPushNotification", {
    userId,
    title: "Kramasha Setup Complete",
    content: "Awesome! You will now receive important updates right here.",
    tag: "kramasha-test",
  });
}
