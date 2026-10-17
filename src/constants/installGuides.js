// Step-by-step "install Kramasha as an app" guides, one per platform/browser.
// Each step: { icon, text } — `icon` is a key into ICONS in InstallDialog.jsx; **bold** in
// `text` marks the on-screen label to look for.
//
// Keep these in step with the browsers' current menus (last reviewed: Sep 2026 —
// iOS 26 Safari, Chrome 14x, Edge 14x, Samsung Internet 2x, macOS Sonoma+ Safari).

export const INSTALL_FAMILIES = [
  { key: "ios", label: "iPhone / iPad", icon: "phone" },
  { key: "android", label: "Android", icon: "android" },
  { key: "desktop", label: "Desktop", icon: "desktop" },
];

const GUIDES = {
  // ------------------------------------------------------------------ iPhone / iPad
  "ios-safari": {
    title: "Install on iPhone (Safari)",
    steps: [
      { icon: "share", text: "Tap the **Share** button in Safari's toolbar (on newer iOS it can be behind the **•••** button — tap that first, then **Share**)." },
      { icon: "plus", text: "Scroll down and tap **Add to Home Screen**." },
      { icon: "toggle", text: "Keep **Open as Web App** switched on, so it opens full-screen like a normal app." },
      { icon: "check", text: "Tap **Add**. Kramasha appears on your Home Screen." },
    ],
    note: "Safari is the most reliable browser for this on iPhone.",
  },
  "ipados-safari": {
    title: "Install on iPad (Safari)",
    steps: [
      { icon: "share", text: "Tap the **Share** button at the top of Safari (next to the address bar)." },
      { icon: "plus", text: "Choose **Add to Home Screen**." },
      { icon: "toggle", text: "Keep **Open as Web App** switched on." },
      { icon: "check", text: "Tap **Add**." },
    ],
  },
  "ios-chrome": {
    title: "Install on iPhone (Chrome)",
    steps: [
      { icon: "share", text: "Tap the **Share** icon at the right end of Chrome's address bar (or **•••** → **Share**)." },
      { icon: "plus", text: "Scroll the list and tap **Add to Home Screen**." },
      { icon: "check", text: "Tap **Add**." },
    ],
    note: "Don't see Add to Home Screen? Open this page in Safari and follow the Safari steps.",
  },
  "ios-edge": {
    title: "Install on iPhone (Edge)",
    steps: [
      { icon: "menu", text: "Tap the **•••** menu at the bottom of Edge, then **Share**." },
      { icon: "plus", text: "Tap **Add to Home Screen**." },
      { icon: "check", text: "Tap **Add**." },
    ],
    note: "Don't see it? Open this page in Safari and use its Share menu.",
  },
  "ios-firefox": {
    title: "Install on iPhone (Firefox)",
    steps: [
      { icon: "menu", text: "Tap the **≡** menu, then **Share**." },
      { icon: "plus", text: "Tap **Add to Home Screen**." },
      { icon: "check", text: "Tap **Add**." },
    ],
    note: "Don't see it? Open this page in Safari and use its Share menu.",
  },
  "ios-other": {
    title: "Install on iPhone",
    steps: [
      { icon: "share", text: "Open this page in **Safari**, then tap the **Share** button." },
      { icon: "plus", text: "Tap **Add to Home Screen**." },
      { icon: "check", text: "Tap **Add**." },
    ],
  },

  // ------------------------------------------------------------------ Android
  "android-chrome": {
    title: "Install on Android (Chrome)",
    steps: [
      { icon: "menu-v", text: "Tap the **⋮** menu at the top right of Chrome." },
      { icon: "install", text: "Tap **Install app** (on some versions: **Add to Home screen**, then **Install**)." },
      { icon: "check", text: "Tap **Install**. Kramasha is added to your Home screen and app drawer." },
    ],
    note: "Tip: if you see the **Install now** button above, one tap does all of this.",
  },
  "android-samsung": {
    title: "Install on Android (Samsung Internet)",
    steps: [
      { icon: "menu", text: "Tap the **☰** menu at the bottom right." },
      { icon: "plus", text: "Tap **Add page to**, then **Home screen** (or the install icon in the address bar)." },
      { icon: "check", text: "Tap **Add** to confirm." },
    ],
  },
  "android-firefox": {
    title: "Install on Android (Firefox)",
    steps: [
      { icon: "menu-v", text: "Tap the **⋮** menu." },
      { icon: "install", text: "Tap **Install** (or **Add to Home screen**)." },
      { icon: "check", text: "Tap **Add** to confirm." },
    ],
  },
  "android-edge": {
    title: "Install on Android (Edge)",
    steps: [
      { icon: "menu", text: "Tap the **•••** menu at the bottom." },
      { icon: "install", text: "Tap **Add to phone** (or **Add to Home screen**)." },
      { icon: "check", text: "Tap **Install**." },
    ],
  },
  "android-other": {
    title: "Install on Android",
    steps: [
      { icon: "menu-v", text: "Open your browser's menu." },
      { icon: "install", text: "Choose **Install app** or **Add to Home screen**." },
      { icon: "check", text: "Confirm. If you don't see it, open this page in **Chrome** and try again." },
    ],
  },

  // ------------------------------------------------------------------ Desktop
  "desktop-chrome": {
    title: "Install on desktop (Chrome)",
    steps: [
      { icon: "monitor-down", text: "Click the **Install** icon at the right end of the address bar (a small screen with a down arrow)." },
      { icon: "menu-v", text: "No icon? Open the **⋮** menu → **Cast, save and share** → **Install page as app…**" },
      { icon: "check", text: "Click **Install**. Kramasha opens in its own window and gets a shortcut in your Start menu / Applications / Dock." },
    ],
    note: "Works the same on Windows, macOS, Linux and Chromebooks. Brave works the same way.",
  },
  "desktop-edge": {
    title: "Install on desktop (Edge)",
    steps: [
      { icon: "monitor-down", text: "Click the **App available / Install** icon at the right end of the address bar." },
      { icon: "menu-h", text: "Or open **⋯** → **Apps** → **Install this site as an app**." },
      { icon: "check", text: "Click **Install**. You can pin it to the taskbar or Start when asked." },
    ],
  },
  "desktop-safari": {
    title: "Install on Mac (Safari)",
    steps: [
      { icon: "share", text: "In Safari's menu bar choose **File** → **Add to Dock…** (or click **Share** → **Add to Dock**). Needs macOS Sonoma or newer." },
      { icon: "check", text: "Keep the name and click **Add**. Kramasha appears in your Dock and Launchpad." },
    ],
  },
  "desktop-firefox": {
    title: "Install on desktop (Firefox)",
    steps: [
      { icon: "globe", text: "Firefox on desktop can't install web apps yet. Open this page in **Chrome** or **Edge**." },
      { icon: "monitor-down", text: "Then click the **Install** icon in the address bar." },
      { icon: "check", text: "Or just bookmark Kramasha (**Ctrl/⌘ + D**) for one-click access." },
    ],
  },
  "desktop-other": {
    title: "Install on desktop",
    steps: [
      { icon: "globe", text: "Open this page in **Chrome** or **Edge**." },
      { icon: "monitor-down", text: "Click the **Install** icon at the right end of the address bar." },
      { icon: "check", text: "Click **Install**." },
    ],
  },
};

// The one step shown first inside in-app browsers (Instagram, WhatsApp, Facebook…).
export const IN_APP_STEP = {
  icon: "external",
  text: "You're inside another app's browser, which can't install apps. Tap the **⋯ / ⋮ / Share** menu and choose **Open in Safari** or **Open in Chrome**, then follow the steps below.",
};

// `env` comes from detectDevice(); `family` overrides it when someone picks another device tab.
export function getInstallGuide(env, family = env.family) {
  const browser = env.browser;
  const isPad = env.os === "ipados";
  let key;
  if (family === "ios") key = isPad && (browser === "safari" || browser === "other") ? "ipados-safari" : `ios-${["safari", "chrome", "edge", "firefox"].includes(browser) ? browser : "other"}`;
  else if (family === "android") key = `android-${["chrome", "samsung", "firefox", "edge"].includes(browser) ? browser : "other"}`;
  else key = `desktop-${["chrome", "edge", "safari", "firefox"].includes(browser) ? browser : browser === "opera" ? "chrome" : "other"}`;
  // Picking another device tab: show that device's default browser instead of guessing.
  if (family !== env.family) key = family === "ios" ? "ios-safari" : family === "android" ? "android-chrome" : "desktop-chrome";
  return GUIDES[key] || GUIDES[`${family}-other`];
}

export const ALL_INSTALL_GUIDES = GUIDES;

export const INSTALL_BENEFITS = [
  { icon: "zap", text: "Opens instantly, full screen — no browser bars" },
  { icon: "bell", text: "Push notifications (Pro) and offline banner" },
  { icon: "lock", text: "Works with App Lock and passkeys" },
];
