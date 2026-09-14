// Push notification service — web push subscription management + test dispatch.
import { base44 } from "@/api/base44Client";

function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getVapidPublicKey() {
  try {
    const res = await base44.functions.invoke("getPushConfig", {});
    const data = res?.data || res;
    return data?.vapidPublicKey || null;
  } catch {
    return null;
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("Push notifications not supported in this browser");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }
  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    throw new Error("VAPID_PUBLIC_KEY secret not configured. Web push is unavailable until it's set in dashboard settings.");
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64urlToUint8Array(vapidPublicKey),
  });
  const subscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: arrayBufferToBase64url(sub.getKey("p256dh")),
      auth: arrayBufferToBase64url(sub.getKey("auth")),
    },
  };
  await base44.functions.invoke("registerPushSubscription", { subscription });
  return subscription;
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  let endpoint = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      endpoint = sub.endpoint;
      await sub.unsubscribe();
    }
  } catch {
    // ignore
  }
  // Delete only THIS device's subscription from backend (by endpoint)
  if (endpoint) {
    try {
      const subs = await base44.entities.PushSubscription.filter({ endpoint });
      if (subs && subs.length > 0) {
        await base44.entities.PushSubscription.delete(subs[0].id);
      }
    } catch {
      // ignore
    }
  }
}

export async function sendTestNotification() {
  return base44.functions.invoke("dispatchPushNotification", {
    title: "Test Notification",
    content: "Push notifications are working! 🎉",
    tag: "test-notification",
  });
}

export async function isCurrentlySubscribed() {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}