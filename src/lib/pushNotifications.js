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

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site. Click the lock icon next to the address bar (or open your device settings), allow Notifications, then try again."
        : "Notification permission was not granted."
    );
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const { vapidPublicKey } = await base44.functions.invoke("getPushConfig", {});
    if (!vapidPublicKey) throw new Error("Push notifications aren't configured on the server yet.");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  await base44.functions.invoke("registerPushSubscription", { subscription: subscription.toJSON() });
  return subscription;
}

// Unsubscribe this device and remove its subscription row server-side.
export async function disablePushNotifications() {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try { await subscription.unsubscribe(); } catch { /* already gone locally */ }
  try {
    const rows = await base44.entities.PushSubscription.filter({ endpoint });
    for (const row of rows || []) await base44.entities.PushSubscription.delete(row.id);
  } catch { /* best-effort — dispatchPushNotification also prunes dead endpoints */ }
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
