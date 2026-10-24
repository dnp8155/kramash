# Dev notes: changes on 2026-10-20

Not user-facing; no version bump or release note added. Build (`vite build`) passes. Nothing was checked in a browser or on a device.

## UI
- **Public pages (About, FAQ, Terms, Privacy, Contact):** removed the footer and deleted `components/common/LegalFooter.jsx`. The logo now sits on the right of the Back button row as a "Home" + logo link to `/`.
- **App & Updates:** a radial doodle mode was tried and reverted. `components/profile/ProfileWallpaper.jsx` and `pages/AppUpdates.jsx` are back to the original sideways drift.
- **Event details, share text:** the Share button on team and service cards opens the new `components/events/ShareAssignmentTextDialog.jsx` (text card, Copy, WhatsApp, native Share, chips for amount, location, map link, custom time, note). Wired in `pages/EventDetails.jsx` (`shareText` state, `shareAssignment`, `shareServiceAssignment`). The service message greets the provider (`provider_name_snapshot`, then the provider member's name); with no provider it falls back to "Hi, <service> is booked on <dates>...". The amount chip uses `currencyIcon(currency)`.
- **More page (mobile):** About & Legal grid is now 2 columns (4 tiles) in `pages/More.jsx`.

## Tailwind warnings
`duration-[Nms]` and `ease-[cubic-bezier(...)]` were ambiguous (transition vs animation utilities). Replaced with explicit arbitrary properties (`[transition-duration:..] [animation-duration:..]`, `[transition-timing-function:..]`) in `components/ui/{dialog,alert-dialog,AppDialog,sheet}.jsx` and `components/landing/{LandingNav,LandingFooter}.jsx`.

## Dependencies (package.json)
- `allowScripts` added: `fsevents` allowed; `core-js`, `protobufjs` (6.x and 7.x) and `@firebase/util` blocked. Re-review with `npm install-scripts ls` when a new package asks.
- `firebase` 9 -> 13. Only `firebase/app` + `firebase/auth` are used (phone OTP). **Test one real phone login before deploy.** Push notifications use Web Push (VAPID + `public/sw.js`), not Firebase, so they are unaffected.
- `overrides`: `@grpc/grpc-js` ^1.14.0 (Firebase's Firestore pins a vulnerable 1.9.x; Firestore is not used).
- `npm audit fix` applied (Quill XSS fix).
- Remaining audit items: `xlsx` (no fix on npm; the app only writes spreadsheets, never parses uploads), `braces` and `postcss-selector-parser` (Tailwind 3 build-time only; fixing needs Tailwind 4).

## Later the same day (v1.1.8.2)
- Notification bell (`components/common/NotificationBell.jsx`) now wraps titles and messages fully (no truncate / line-clamp). Push text was never shortened server-side; `public/sw.js` only got a comment.
- Refund / cancellation policy lives only in Terms section 5.5 (no separate /refund page). Terms 5.4 now says cancel before the renewal date.
- Version 1.1.8.2 (package.json, package-lock.json, `src/lib/appConfig.js`, release notes, `tests/releaseNotes.test.js`). Package name changed from `base44-app` to `kramasha`.
- Install section: Install button on landing, Opera Android guide, Samsung/Firefox notes (`components/landing/InstallSection.jsx`, `constants/installGuides.js`).
