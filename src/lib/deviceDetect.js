// Works out which device + browser the app is open on, so the install guide can show the
// steps that actually apply. Detection is user-agent based (there's no other way to know
// the browser), with the usual special cases:
//   - iPadOS 13+ reports itself as a Mac, so "Mac with a touch screen" means iPad.
//   - Chrome/Edge/Firefox on iOS are WebKit under the hood; their menus differ, so they
//     get their own steps.
//   - In-app browsers (Instagram, Facebook, WhatsApp, Android WebView) can't install
//     anything — the guide tells people to open the link in their real browser first.

export function detectDevice() {
  if (typeof navigator === "undefined") return { family: "desktop", os: "other", browser: "chrome", inApp: false, label: "your device" };
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;

  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  let os = "other";
  if (isIPhone) os = "ios";
  else if (isIPad) os = "ipados";
  else if (isAndroid) os = "android";
  else if (/Windows/.test(ua)) os = "windows";
  else if (/CrOS/.test(ua)) os = "chromeos";
  else if (/Macintosh|Mac OS X/.test(ua)) os = "mac";
  else if (/Linux|X11/.test(ua)) os = "linux";

  const family = os === "ios" || os === "ipados" ? "ios" : os === "android" ? "android" : "desktop";

  let browser = "other";
  if (/EdgA|EdgiOS|Edg\//.test(ua)) browser = "edge";
  else if (/OPR\/|OPiOS|Opera/.test(ua)) browser = "opera";
  else if (/SamsungBrowser/.test(ua)) browser = "samsung";
  else if (/FxiOS|Firefox/.test(ua)) browser = "firefox";
  else if (/CriOS|Chrome|Chromium/.test(ua)) browser = "chrome";
  else if (/Safari/.test(ua)) browser = "safari";

  const inApp = /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|TikTok|MicroMessenger|WhatsApp|GSA\//.test(ua)
    || (isAndroid && /; wv\)/.test(ua));

  const device =
    os === "ios" ? "iPhone"
    : os === "ipados" ? "iPad"
    : os === "android" ? (/Mobile/.test(ua) ? "Android phone" : "Android tablet")
    : os === "windows" ? "Windows"
    : os === "mac" ? "Mac"
    : os === "chromeos" ? "Chromebook"
    : os === "linux" ? "Linux"
    : "your device";
  const browserName = { safari: "Safari", chrome: "Chrome", edge: "Edge", firefox: "Firefox", samsung: "Samsung Internet", opera: "Opera" }[browser];

  return { family, os, browser, inApp, label: browserName ? `${device} · ${browserName}` : device };
}
