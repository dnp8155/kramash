# KRAMAS — Firebase Migration & Setup Guide

> **Purpose:** This document is the single source of truth for migrating KRAMAS from Base44 to Firebase. It lists every pending setup item, every database collection with every field, every Cloud Function, every configuration step, and offline sync strategy. Codex/AI should read this document end-to-end and build the Firebase backend directly.

---

## TABLE OF CONTENTS

1. [Current Architecture (Base44)](#1-current-architecture-base44)
2. [Firebase Project Setup — Pending Items](#2-firebase-project-setup--pending-items)
3. [Environment Variables & Secrets](#3-environment-variables--secrets)
4. [Firebase Services to Enable (Core + Additional)](#4-firebase-services-to-enable)
5. [Database Collections (Firestore) — Complete Schema](#5-database-collections-firestore--complete-schema)
6. [Cloud Functions — Complete List](#6-cloud-functions--complete-list)
7. [Offline Data Sync — Cross-Device (On/Offline)](#7-offline-data-sync--cross-device-on-offline)
8. [Frontend Changes — FCM & Push](#8-frontend-changes--fcm--push)
9. [Security Rules (Firestore & Storage)](#9-security-rules-firestore--storage)
10. [Data Migration Steps](#10-data-migration-steps)
11. [Known Issues & Limitations](#11-known-issues--limitations)

---

## 1. Current Architecture (Base44)

| Layer | Current (Base44) | Target (Firebase) |
|-------|------------------|-------------------|
| Auth | Base44 Auth (email/password, Google OAuth) + Firebase Phone OTP (verify only) | Firebase Auth (email/password, Google, Phone) |
| Database | Base44 Entities (MongoDB-backed) | Cloud Firestore |
| File Storage | Base44 UploadFile / UploadPrivateFile | Firebase Storage |
| Backend Functions | Base44 `base44/functions/*/entry.ts` | Firebase Cloud Functions (v2) |
| Push Notifications | Base44 `SendPushNotification` (not wired) | Firebase Cloud Messaging (FCM) |
| Scheduled Tasks | Base44 Workflows | Firebase Cloud Functions + Cloud Scheduler |
| Realtime | Base44 entity subscriptions | Firestore `onSnapshot` listeners |
| Offline Sync | Partial (service worker + OfflineBanner) | Firestore persistentLocalCache (native) |
| RLS | Base44 `rls` rules in entity JSON | Firestore Security Rules |

### Current Backend Functions (Base44 → Firebase Cloud Functions mapping)

| # | Base44 Function | Firebase Cloud Function | Trigger |
|---|----------------|----------------------|---------|
| 1 | `sendOtp` | `sendOtp` | HTTPS callable |
| 2 | `verifyOtp` | `verifyOtp` | HTTPS callable |
| 3 | `verifyFirebaseToken` | *(not needed — Firebase Auth handles natively)* | — |
| 4 | `createEvent` | `createEvent` | Firestore `onCreate` or callable |
| 5 | `createTeamMember` | `createTeamMember` | callable |
| 6 | `createService` | `createService` | callable |
| 7 | `generateNotifications` | `generateNotifications` | callable + scheduled (cron) |
| 8 | `trackStorageUsage` | `trackStorageUsage` | Firestore `onWrite` (storage metadata) |
| 9 | `agentChat` | `agentChat` | HTTPS callable (uses Vertex AI / Gemini) |
| 10 | `clientViewQuotation` | `clientViewQuotation` | callable |
| 11 | `signQuotation` | `signQuotation` | callable |
| 12 | `createPaymentOrder` | `createPaymentOrder` | callable (Razorpay/Stripe) |
| 13 | `verifyPayment` | `verifyPayment` | callable |
| 14 | `handleRazorpayWebhook` | `handleRazorpayWebhook` | HTTPS webhook |
| 15 | `handleStripeWebhook` | `handleStripeWebhook` | HTTPS webhook |
| 16 | `initWorkspaceSubscription` | `initWorkspaceSubscription` | callable |
| 17 | `assignProSubscription` | `assignProSubscription` | callable (admin) |
| 18 | `downgradeToFree` | `downgradeToFree` | callable |
| 19 | `submitUpgradeRequest` | `submitUpgradeRequest` | callable |
| 20 | `adminDashboardStats` | `adminDashboardStats` | callable (admin) |
| 21 | `adminListWorkspaces` | `adminListWorkspaces` | callable (admin) |
| 22 | `adminGetWorkspaceDetails` | `adminGetWorkspaceDetails` | callable (admin) |
| 23 | `adminSetWorkspaceStatus` | `adminSetWorkspaceStatus` | callable (admin) |
| 24 | `sendFcmPush` | `sendFcmPush` | callable + invoked from other functions |
| 25 | `registerFcmToken` | `registerFcmToken` | callable |

---

## 2. Firebase Project Setup — Pending Items

### 2.1 Firebase Console Configuration

- [ ] **Create Firebase Project** — Name: `kramashah` (or preferred)
- [ ] **Add Web App** — Register web app, copy config into `src/lib/firebaseConfig.js`
- [ ] **Enable Authentication providers:**
  - [ ] Email/Password
  - [ ] Google
  - [ ] Phone (for OTP login)
- [ ] **Add authorized domains** in Authentication → Settings:
  - `kramashah.base44.app`
  - `localhost` (dev)
  - Custom domain (when connected)
- [ ] **Enable Cloud Firestore** — Start in production mode, configure security rules
- [ ] **Enable Firebase Storage** — For file uploads (quotations, signatures, workspace logo)
- [ ] **Enable Cloud Messaging (FCM)** — Generate VAPID key pair (Project Settings → Cloud Messaging → Web Push certificates)
- [ ] **Generate Service Account key** — Project Settings → Service Accounts → Generate New Private Key (JSON) → used for Admin SDK
- [ ] **Enable Cloud Functions** — Upgrade to Blaze plan (required for external API calls)
- [ ] **Enable Vertex AI / Gemini API** — For `agentChat` function (or use Google AI Studio API key)

### 2.2 Firebase Config Values to Update

File: `src/lib/firebaseConfig.js`

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "kramashah-XXXXX.firebaseapp.com",
  projectId: "kramashah-XXXXX",
  storageBucket: "kramashah-XXXXX.appspot.com",
  messagingSenderId: "XXXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXXXX",
  // ADD for FCM:
  vapidKey: "BLBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
};
```

### 2.3 Service Worker Files to Create

- [ ] `public/firebase-messaging-sw.js` — FCM background message handler
- [ ] Update `public/sw.js` — Integrate FCM or keep separate

---

## 3. Environment Variables & Secrets

### 3.1 Firebase Service Account (for Admin SDK / Cloud Functions)

Set these as Firebase Cloud Functions environment config or `.env`:

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Project Settings → General |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Service account JSON `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account private key (PEM) | Service account JSON `private_key` |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket URL | `kramashah-XXXXX.appspot.com` |

### 3.2 Third-Party API Keys

| Secret Name | Description | Status |
|-------------|-------------|--------|
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | ⏳ Pending user setup |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret | ⏳ Pending user setup |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret | ⏳ Pending user setup |
| `STRIPE_SECRET_KEY` | Stripe secret key | ⏳ Pending (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ⏳ Pending (optional) |
| `GEMINI_API_KEY` | Google AI Studio API key (for agentChat) | ⏳ Pending |
| `BASE44_API_KEY` | Legacy Base44 API key (during migration) | ✅ Set |

### 3.3 Firebase Client Config (public — safe to expose)

These go in `src/lib/firebaseConfig.js` and are public by Firebase design:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`
- `vapidKey` (for FCM web push)

---

## 4. Firebase Services to Enable

### 4.1 Core Services (Already Planned)

| Service | Purpose | Status |
|---------|---------|--------|
| **Authentication** | Email/password, Google, Phone OTP | ⏳ Phone pending; email/Google via Base44 |
| **Cloud Firestore** | All app data (replaces Base44 entities) | ⏳ Pending |
| **Firebase Storage** | File uploads (logos, signatures, PDFs) | ⏳ Pending |
| **Cloud Messaging (FCM)** | Push notifications | ⏳ Pending |
| **Cloud Functions** | Backend logic (replaces Base44 functions) | ⏳ Pending (requires Blaze plan) |
| **Cloud Scheduler** | Scheduled notification generation | ⏳ Pending |
| **Vertex AI / Gemini** | AI agent chat | ⏳ Pending |

### 4.2 Additional Firebase Services — Recommended for KRAMAS

> These services are **not yet in the plan** but are genuinely useful and needed for a production-ready SaaS. Codex should evaluate and set up the ones marked **MUST HAVE**; the rest are optional enhancements.

#### 🔴 MUST HAVE (needed for migration)

| # | Service | Why KRAMAS Needs It | Setup Effort |
|---|---------|-------------------|-------------|
| 1 | **Firebase Hosting** | After migrating from Base44, the web app needs to be hosted somewhere. Firebase Hosting provides global CDN, SSL, custom domain, and preview channels. Replaces Base44's hosting. | Low — `firebase deploy --only hosting` |
| 2 | **Cloud Tasks** | Queue-based async work — e.g., after a quotation is signed, queue a push notification + email + PDF generation. Prevents Cloud Function timeouts. Replaces Base44's post-response work pattern. | Medium — create task queues in Cloud Functions |

#### 🟠 HIGH VALUE (strongly recommended)

| # | Service | Why KRAMAS Needs It | Setup Effort |
|---|---------|-------------------|-------------|
| 3 | **Google Analytics for Firebase** | Track user behavior — which features are used most (events created, quotations sent, payments recorded), user retention, conversion funnels (signup → onboarding → first event). Replaces manual analytics tracking. | Low — add SDK, enable in console |
| 4 | **Firebase Performance Monitoring** | Monitor slow Firestore queries, page load times, Cloud Function execution times, network latency. Critical for a SaaS with financial data — catch performance issues before users complain. | Low — add SDK, automatic tracing |
| 5 | **Firebase Remote Config** | Change plan limits, pricing, feature flags, maintenance banners, AI agent prompts **without redeploying**. E.g., flip `pdf_export_enabled` for free plan, change max_events limit, show a Diwali discount banner — all from Firebase Console. Replaces hardcoded `PlanLimit` entity reads. | Medium — define config keys + SDK integration |
| 6 | **Firebase App Check** | Protect Firestore, Storage, and Cloud Functions from unauthorized clients and abuse. Uses reCAPTCHA Enterprise (web) or Device Check/Play Integrity (mobile). Essential since KRAMAS handles financial data and has public quotation links (`/q/:id`). | Medium — enable per service, add SDK |
| 7 | **Firebase Crashlytics** | Real-time crash and error reporting. KRAMAS has complex flows (quotation signing, payment verification, PDF generation) — catch JS errors, Cloud Function crashes, and non-fatal exceptions with stack traces and user context. | Low — add SDK (web version available) |

#### 🟡 NICE TO HAVE (optional enhancements)

| # | Service | Why KRAMAS Could Use It | Setup Effort |
|---|---------|----------------------|-------------|
| 8 | **Firebase In-App Messaging** | Show contextual banners/modals to users — onboarding tips for new photographers, "Upgrade to Pro" prompts when they hit free plan limits, feature announcements. More targeted than the current `UpdateBanner` component. | Medium — create campaigns in console |
| 9 | **Firebase A/B Testing** | Test different onboarding flows, pricing page layouts, quotation template designs, notification wording. E.g., "Upgrade Now" vs "Go Pro" button text — measure which converts better. | Medium — set up experiments |
| 10 | **Firebase Extensions** | Pre-built packages: **Resize Images** (auto-resize workspace logo, quotation attachments), **Trigger Email** (send emails on Firestore writes — e.g., when quotation status changes), **Export to BigQuery** (analytics on financial data), **Delete User Data** (GDPR compliance — auto-delete user's data when they delete their account). | Low — install from extensions marketplace |
| 11 | **Firebase Dynamic Links** *(deprecated — use Firebase Hosting deep links)* | Smart links for WhatsApp sharing of quotations (`/q/:id`). When a client taps the link on mobile, it opens the app (if installed) or the web app. Currently using plain URLs — Dynamic Links would improve the mobile sharing experience. | Medium — configure + SDK |

#### 🟢 FUTURE CONSIDERATION (when scaling)

| # | Service | Why KRAMAS Could Use It Later | Setup Effort |
|---|---------|------------------------------|-------------|
| 12 | **Firebase Predictions** | AI-based user segmentation — predict which users are likely to churn (haven't created an event in 30 days), which are likely to upgrade (hitting free plan limits). Use for targeted push notifications and email campaigns. | High — requires Analytics + ML setup |
| 13 | **Cloud Firestore Bundles** | Pre-package static data (plans, plan_pricings, plan_limits) into a bundle served from CDN. Reduces Firestore reads for data that rarely changes. Saves costs at scale. | Medium — build bundle in Cloud Function |
| 14 | **Eventarc for Firebase** | Event-driven architecture — trigger Cloud Functions on Eventarc events (e.g., audit log events, custom events). Useful for compliance logging and cross-service orchestration. | High — requires Eventarc setup |
| 15 | **Firebase ML** | On-device ML for smart features — e.g., auto-categorize expenses from receipt photos, smart event title suggestions. Alternative to server-side Gemini calls for simple tasks. | High — ML model integration |

### 4.3 Service Priority Summary for Codex

```
PHASE 1 (Migration — must do):
  ✅ Authentication
  ✅ Cloud Firestore (with offline persistence — see Section 7)
  ✅ Firebase Storage
  ✅ Cloud Functions
  ✅ Cloud Messaging (FCM)
  ✅ Cloud Scheduler
  ✅ Firebase Hosting
  ✅ Cloud Tasks
  ✅ Vertex AI / Gemini (for agentChat)

PHASE 2 (Production hardening — strongly recommended):
  🔶 Google Analytics for Firebase
  🔶 Firebase Performance Monitoring
  🔶 Firebase Remote Config
  🔶 Firebase App Check
  🔶 Firebase Crashlytics

PHASE 3 (Growth & optimization — when ready):
  🔷 Firebase In-App Messaging
  🔷 Firebase A/B Testing
  🔷 Firebase Extensions (Resize Images, Trigger Email, Export to BigQuery)

PHASE 4 (Scale — later):
  🔵 Firebase Predictions
  🔵 Firestore Bundles
  🔵 Eventarc
  🔵 Firebase ML
```

---

## 5. Database Collections (Firestore) — Complete Schema

> **Convention:** Each Base44 entity → one Firestore collection. Document ID = entity `id`. Built-in fields (`id`, `created_date`, `updated_date`, `created_by_id`) map to Firestore document fields.

### 5.1 `users` (built-in — Firebase Auth + Firestore profile)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | (auth uid) | Firebase Auth UID |
| `email` | string | ✅ | — | From Firebase Auth |
| `full_name` | string | ❌ | — | Display name |
| `role` | string (enum) | ✅ | `user` | `admin` \| `user` (platform-level) |
| `phone` | string | ❌ | — | E.164 format (e.g. `+91...`) |
| `language` | string (enum) | ❌ | `en` | `en` \| `hi` \| `gu` |
| `fcm_token` | string | ❌ | — | **NEW** — Device push token (FCM) |
| `fcm_tokens` | array<string> | ❌ | — | **NEW** — Multi-device tokens |
| `active_workspace_id` | string | ❌ | — | Currently selected workspace |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |

**Security:** Users can read/update own profile. Admins can list/update all.

---

### 5.2 `workspaces`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `name` | string | ✅ | — | Business / Workspace Name |
| `business_type` | string | ❌ | — | Free text |
| `business_category` | string (enum) | ❌ | `OTHER` | `PHOTOGRAPHY` \| `EVENT_MANAGEMENT` \| `ARCHITECTURE` \| `OTHER` |
| `custom_business_type` | string | ❌ | — | For OTHER category |
| `custom_work_label_singular` | string | ❌ | — | e.g. "Project" |
| `custom_work_label_plural` | string | ❌ | — | e.g. "Projects" |
| `owner_user_id` | string | ✅ | — | References `users.id` |
| `email` | string | ❌ | — | Business email |
| `phone` | string | ❌ | — | Business phone |
| `logo` | string | ❌ | — | Logo URL (Storage) |
| `address` | string | ❌ | — | |
| `city` | string | ❌ | — | |
| `state` | string | ❌ | — | |
| `country` | string | ❌ | — | |
| `currency` | string | ❌ | `INR` | ISO currency code |
| `timezone` | string | ❌ | `Asia/Kolkata` | |
| `plan_type` | string (enum) | ❌ | `free` | `free` \| `pro` |
| `plan_status` | string (enum) | ❌ | `active` | `active` \| `suspended` \| `cancelled` |
| `gst_enabled` | boolean | ❌ | `false` | |
| `gstin` | string | ❌ | — | GST identification number |
| `gst_business_name` | string | ❌ | — | |
| `gst_billing_address` | string | ❌ | — | |
| `gst_state` | string | ❌ | — | |
| `default_gst_rate` | number | ❌ | `18` | Percentage |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | References `users.id` |

**Security:** Only `owner_user_id` can read/update/delete. Create requires `owner_user_id == user.id`.

---

### 5.3 `workspace_members`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | References `workspaces.id` |
| `user_id` | string | ✅ | — | References `users.id` |
| `role` | string (enum) | ❌ | `owner` | `owner` \| `admin` \| `accountant` \| `manager` \| `staff` |
| `status` | string (enum) | ❌ | `active` | `active` \| `invited` \| `removed` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** User can read/update where `user_id == auth.uid`. Create requires `user_id == auth.uid`.

---

### 5.4 `clients`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `name` | string | ✅ | — | Client Name |
| `phone` | string | ❌ | — | |
| `alternate_phone` | string | ❌ | — | |
| `email` | string (email) | ❌ | — | |
| `address` | string | ❌ | — | |
| `city` | string | ❌ | — | |
| `state` | string | ❌ | — | |
| `country` | string | ❌ | — | |
| `notes` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.5 `events`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `client_id` | string | ✅ | — | References `clients.id` |
| `title` | string | ✅ | — | Event/Project title |
| `event_type` | string | ❌ | — | e.g. Wedding, Birthday |
| `start_date` | date (string) | ✅ | — | ISO date `YYYY-MM-DD` |
| `end_date` | date (string) | ❌ | — | ISO date |
| `venue` | string | ❌ | — | |
| `venue_address` | string | ❌ | — | |
| `status` | string (enum) | ❌ | `upcoming` | `upcoming` \| `in-progress` \| `completed` \| `cancelled` |
| `contract_value` | number | ❌ | `0` | Agreed value |
| `description` | string | ❌ | — | |
| `notes` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Create requires `role == admin`. Read/update/delete restricted to `created_by_id == auth.uid`.

---

### 5.6 `team_members`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `name` | string | ✅ | — | |
| `phone` | string | ❌ | — | |
| `email` | string (email) | ❌ | — | |
| `role_id` | string | ❌ | — | References `team_roles.id` |
| `profession` | string | ❌ | — | e.g. Photographer, Editor |
| `default_rate` | number | ❌ | `0` | |
| `rate_type` | string (enum) | ❌ | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` |
| `notes` | string | ❌ | — | |
| `status` | string (enum) | ❌ | `active` | `active` \| `inactive` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Create requires `role == admin`. Read/update/delete restricted to `created_by_id == auth.uid`.

---

### 5.7 `team_roles`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `name` | string | ✅ | — | Role Name |
| `default_rate` | number | ❌ | `0` | |
| `rate_type` | string (enum) | ❌ | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` |
| `status` | string (enum) | ❌ | `active` | `active` \| `inactive` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.8 `team_block_dates`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `team_member_id` | string | ✅ | — | References `team_members.id` |
| `start_date` | date (string) | ✅ | — | ISO date |
| `end_date` | date (string) | ❌ | — | ISO date |
| `reason` | string | ❌ | `Leave` | |
| `status` | string (enum) | ❌ | `active` | `active` \| `cancelled` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.9 `event_team_assignments`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `event_id` | string | ✅ | — | References `events.id` |
| `team_member_id` | string | ✅ | — | References `team_members.id` |
| `role_id` | string | ❌ | — | References `team_roles.id` |
| `role_name_snapshot` | string | ❌ | — | Denormalized role name |
| `agreed_rate` | number | ❌ | `0` | |
| `rate_type` | string (enum) | ❌ | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` |
| `assignment_status` | string (enum) | ❌ | `assigned` | `assigned` \| `removed` |
| `notes` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.10 `services`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `name` | string | ✅ | — | Service Name |
| `description` | string | ❌ | — | |
| `default_rate` | number | ❌ | `0` | |
| `rate_type` | string (enum) | ❌ | `Fixed` | `Fixed` \| `Per Day` \| `Per Unit` |
| `gst_rate` | number | ❌ | `0` | Percentage |
| `sac_code` | string | ❌ | — | GST SAC code |
| `status` | string (enum) | ❌ | `active` | `active` \| `inactive` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Create requires `role == admin`. Read/update/delete restricted to `created_by_id == auth.uid`.

---

### 5.11 `quotations`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `quotation_number` | string | ✅ | — | Unique quote number |
| `client_id` | string | ❌ | — | References `clients.id` |
| `event_id` | string | ❌ | — | References `events.id` |
| `quotation_date` | date (string) | ✅ | — | ISO date |
| `valid_until` | date (string) | ❌ | — | ISO date |
| `status` | string (enum) | ❌ | `draft` | `draft` \| `finalized` \| `accepted` \| `rejected` |
| `subtotal` | number | ❌ | `0` | |
| `discount_type` | string (enum) | ❌ | `percent` | `percent` \| `fixed` |
| `discount_value` | number | ❌ | `0` | |
| `discount_amount` | number | ❌ | `0` | Calculated |
| `taxable_amount` | number | ❌ | `0` | |
| `gst_applicable` | boolean | ❌ | `false` | |
| `gst_mode` | string (enum) | ❌ | `cgst_sgst` | `cgst_sgst` \| `igst` |
| `cgst_amount` | number | ❌ | `0` | |
| `sgst_amount` | number | ❌ | `0` | |
| `igst_amount` | number | ❌ | `0` | |
| `gst_total` | number | ❌ | `0` | |
| `grand_total` | number | ❌ | `0` | |
| `terms_and_conditions` | string | ❌ | — | |
| `notes` | string | ❌ | — | |
| `client_snapshot` | string (JSON) | ❌ | — | Denormalized client data |
| `business_snapshot` | string (JSON) | ❌ | — | Denormalized workspace data |
| `event_snapshot` | string (JSON) | ❌ | — | Denormalized event data |
| `client_signature` | string | ❌ | — | Data URL of signature |
| `signed_by_name` | string | ❌ | — | Client name who signed |
| `signed_at` | timestamp | ❌ | — | When signed |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.12 `quotation_items`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `quotation_id` | string | ✅ | — | References `quotations.id` |
| `item_type` | string (enum) | ❌ | — | `service` \| `role` \| `custom` |
| `reference_id` | string | ❌ | — | References `services.id` or `team_roles.id` |
| `name` | string | ✅ | — | |
| `description` | string | ❌ | — | |
| `quantity` | number | ❌ | `1` | |
| `days` | number | ❌ | `1` | |
| `unit_rate` | number | ❌ | `0` | |
| `rate_type` | string (enum) | ❌ | `Fixed` | `Fixed` \| `Per Day` \| `Per Unit` \| `Per Event` |
| `line_total` | number | ❌ | `0` | Calculated |
| `gst_rate` | number | ❌ | `0` | Percentage |
| `sac_code` | string | ❌ | — | |
| `sort_order` | number | ❌ | `0` | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.13 `financial_transactions`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `event_id` | string | ❌ | — | References `events.id` |
| `transaction_type` | string (enum) | ✅ | — | `CLIENT_RECEIPT` \| `TEAM_PAYMENT` \| `BUSINESS_EXPENSE` |
| `client_id` | string | ❌ | — | References `clients.id` |
| `team_member_id` | string | ❌ | — | References `team_members.id` |
| `team_assignment_id` | string | ❌ | — | References `event_team_assignments.id` |
| `expense_category_id` | string | ❌ | — | References `expense_categories.id` |
| `expense_category_name_snapshot` | string | ❌ | — | Denormalized |
| `amount` | number | ✅ | — | |
| `payment_method` | string (enum) | ❌ | `Cash` | `Cash` \| `UPI` \| `Bank Transfer` \| `Card` \| `Cheque` \| `Other` |
| `transaction_date` | date (string) | ✅ | — | ISO date |
| `reference_number` | string | ❌ | — | |
| `notes` | string | ❌ | — | |
| `status` | string (enum) | ❌ | `ACTIVE` | `ACTIVE` \| `VOID` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.14 `expense_categories`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `name` | string | ✅ | — | Category Name |
| `status` | string (enum) | ❌ | `active` | `active` \| `inactive` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.15 `event_reminders`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `event_id` | string | ✅ | — | References `events.id` |
| `reminder_type` | string (enum) | ❌ | `24_hours` | `24_hours` \| `48_hours` \| `custom` |
| `custom_hours` | number | ❌ | `0` | For custom type |
| `scheduled_for` | timestamp | ❌ | — | When to send |
| `status` | string (enum) | ❌ | `pending` | `pending` \| `sent` \| `cancelled` |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** CRUD restricted to `created_by_id == auth.uid`.

---

### 5.16 `notifications`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `user_id` | string | ✅ | — | Recipient user ID |
| `type` | string (enum) | ✅ | — | `event_reminder` \| `payment_due` \| `subscription_expiring` \| `subscription_expired` \| `team_conflict` \| `general` |
| `title` | string | ✅ | — | |
| `message` | string | ❌ | — | |
| `related_entity_type` | string | ❌ | — | e.g. `event`, `subscription` |
| `related_entity_id` | string | ❌ | — | |
| `read` | boolean | ❌ | `false` | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Read where `user_id == auth.uid`. Update/delete where `user_id == auth.uid`. Create requires `role == admin`.

---

### 5.17 `plans`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `code` | string | ✅ | — | Plan code (e.g. `FREE`, `PRO`) |
| `name` | string | ✅ | — | Display Name |
| `description` | string | ❌ | — | |
| `is_active` | boolean | ❌ | `true` | |
| `sort_order` | number | ❌ | `0` | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Public read. Create/update/delete requires `role == admin`.

---

### 5.18 `plan_pricings`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `plan_id` | string | ✅ | — | References `plans.id` |
| `billing_cycle` | string (enum) | ✅ | — | `MONTHLY` \| `SIX_MONTHS` \| `ANNUAL` |
| `price` | number | ✅ | — | |
| `currency` | string | ❌ | `INR` | |
| `duration_months` | number | ✅ | — | |
| `storage_gb` | number | ❌ | `0` | Database storage limit |
| `is_active` | boolean | ❌ | `true` | |
| `sort_order` | number | ❌ | `0` | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Public read. Create/update/delete requires `role == admin`.

---

### 5.19 `plan_limits`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `plan_id` | string | ✅ | — | References `plans.id` |
| `limit_key` | string (enum) | ✅ | — | `max_events` \| `max_team_members` \| `max_services` \| `max_storage_gb` \| `pdf_export_enabled` \| `reminders_enabled` |
| `limit_value` | string | ✅ | — | Number or `true`/`false` |
| `enabled` | boolean | ❌ | `true` | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Public read. Create/update/delete requires `role == admin`.

---

### 5.20 `workspace_subscriptions`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | References `workspaces.id` |
| `plan_id` | string | ✅ | — | References `plans.id` |
| `pricing_id` | string | ❌ | — | References `plan_pricings.id` |
| `status` | string (enum) | ✅ | `ACTIVE` | `ACTIVE` \| `EXPIRED` \| `CANCELLED` \| `SUSPENDED` |
| `started_at` | date (string) | ❌ | — | ISO date |
| `expires_at` | date (string) | ❌ | — | ISO date |
| `auto_renew` | boolean | ❌ | `false` | |
| `source` | string (enum) | ❌ | `ADMIN` | `ADMIN` \| `PAYMENT_GATEWAY` \| `PROMOTIONAL` \| `ONBOARDING` |
| `assigned_price` | number | ❌ | `0` | Snapshot |
| `billing_cycle_snapshot` | string | ❌ | — | |
| `updated_by` | string | ❌ | — | User ID |
| `note` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Read where `created_by_id == auth.uid` OR `role == admin`. Create/update/delete requires `role == admin`.

---

### 5.21 `subscription_payments`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `subscription_id` | string | ❌ | — | References `workspace_subscriptions.id` |
| `plan_id` | string | ❌ | — | References `plans.id` |
| `pricing_id` | string | ❌ | — | References `plan_pricings.id` |
| `amount` | number | ✅ | — | |
| `currency` | string | ❌ | `INR` | |
| `gateway` | string | ❌ | `stripe` | `stripe` \| `razorpay` |
| `gateway_order_id` | string | ❌ | — | Order/Session ID |
| `gateway_payment_id` | string | ❌ | — | Payment ID |
| `billing_cycle_snapshot` | string | ❌ | — | |
| `status` | string (enum) | ✅ | `CREATED` | `CREATED` \| `SUCCESS` \| `FAILED` \| `REFUNDED` |
| `verified_at` | timestamp | ❌ | — | |
| `failure_reason` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Read where `created_by_id == auth.uid` OR `role == admin`. Create requires `created_by_id == auth.uid`. Update/delete requires `role == admin`.

---

### 5.22 `upgrade_requests`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | |
| `requested_plan` | string | ❌ | `PRO` | Plan code |
| `requested_pricing_id` | string | ❌ | — | References `plan_pricings.id` |
| `status` | string (enum) | ✅ | `PENDING` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `requested_at` | timestamp | ❌ | — | |
| `reviewed_at` | timestamp | ❌ | — | |
| `reviewed_by` | string | ❌ | — | Admin user ID |
| `note` | string | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** Read where `created_by_id == auth.uid` OR `role == admin`. Create requires `created_by_id == auth.uid`. Update/delete requires `role == admin`.

---

### 5.23 `storage_usage`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `workspace_id` | string | ✅ | — | Unique (one per workspace) |
| `total_bytes` | number | ❌ | `0` | Total bytes used |
| `file_count` | number | ❌ | `0` | Number of files |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |
| `created_by_id` | string | ✅ | — | |

**Security:** All operations require `role == admin`.

---

### 5.24 `fcm_tokens` (NEW — for multi-device push)

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | ✅ | — | |
| `user_id` | string | ✅ | — | References `users.id` |
| `token` | string | ✅ | — | FCM device token |
| `device_type` | string | ❌ | `web` | `web` \| `ios` \| `android` |
| `is_active` | boolean | ❌ | `true` | |
| `last_used_at` | timestamp | ❌ | — | |
| `created_date` | timestamp | ✅ | now | |
| `updated_date` | timestamp | ✅ | now | |

**Security:** Read/create/update/delete where `user_id == auth.uid`.

---

### Collection Count Summary

| # | Collection | Field Count |
|---|-----------|-------------|
| 1 | `users` | 11 |
| 2 | `workspaces` | 26 |
| 3 | `workspace_members` | 7 |
| 4 | `clients` | 15 |
| 5 | `events` | 17 |
| 6 | `team_members` | 14 |
| 7 | `team_roles` | 9 |
| 8 | `team_block_dates` | 10 |
| 9 | `event_team_assignments` | 14 |
| 10 | `services` | 12 |
| 11 | `quotations` | 31 |
| 12 | `quotation_items` | 18 |
| 13 | `financial_transactions` | 18 |
| 14 | `expense_categories` | 7 |
| 15 | `event_reminders` | 10 |
| 16 | `notifications` | 12 |
| 17 | `plans` | 8 |
| 18 | `plan_pricings` | 12 |
| 19 | `plan_limits` | 7 |
| 20 | `workspace_subscriptions` | 16 |
| 21 | `subscription_payments` | 17 |
| 22 | `upgrade_requests` | 12 |
| 23 | `storage_usage` | 7 |
| 24 | `fcm_tokens` (NEW) | 8 |

**Total: 24 collections, ~299 fields**

---

## 6. Cloud Functions — Complete List

### 6.1 Callable Functions (HTTPS)

```
functions/
├── sendOtp              (callable) — Send phone OTP via Firebase Auth
├── verifyOtp            (callable) — Verify OTP, return custom token
├── registerFcmToken     (callable) — Save/update FCM device token
├── sendFcmPush          (callable) — Send FCM push to user(s)
├── createEvent          (callable) — Create event + reminder
├── createTeamMember     (callable) — Create team member
├── createService        (callable) — Create service
├── generateNotifications (callable) — Scan & create in-app + push notifications
├── trackStorageUsage    (callable) — Check/add storage bytes
├── agentChat            (callable) — AI agent conversation (Gemini/Vertex)
├── clientViewQuotation  (callable) — Public quotation view by client
├── signQuotation        (callable) — Client signs quotation
├── createPaymentOrder   (callable) — Create Razorpay/Stripe order
├── verifyPayment        (callable) — Verify payment status
├── initWorkspaceSubscription (callable) — Initialize free subscription
├── assignProSubscription (callable, admin) — Assign Pro plan
├── downgradeToFree      (callable) — Downgrade to free plan
├── submitUpgradeRequest (callable) — Submit upgrade request
├── adminDashboardStats  (callable, admin) — Platform stats
├── adminListWorkspaces  (callable, admin) — List all workspaces
├── adminGetWorkspaceDetails (callable, admin) — Workspace details
└── adminSetWorkspaceStatus (callable, admin) — Set workspace status
```

### 6.2 Webhook Functions (HTTPS)

```
├── handleRazorpayWebhook  (webhook) — Razorpay payment webhook
└── handleStripeWebhook    (webhook) — Stripe payment webhook
```

### 6.3 Triggered Functions

```
├── onQuotationSigned      (Firestore onUpdate) — When quotation status → accepted
├── onStorageUpload        (Storage onFinalize) — Track storage usage
├── onEventCreated         (Firestore onCreate) — Create event reminders
└── onTeamAssignmentCreated (Firestore onCreate) — Check conflicts
```

### 6.4 Scheduled Functions (Cloud Scheduler)

```
├── scheduledGenerateNotifications (cron: 0 */1 * * *) — Every hour
├── scheduledEventReminders       (cron: 0 9 * * *) — Daily 9 AM
└── scheduledSubscriptionCheck   (cron: 0 0 * * *) — Daily midnight
```

### 6.5 Function Details — `sendFcmPush` (NEW)

**Purpose:** Send FCM push notification to one or more users.

**Input:**
```json
{
  "user_ids": ["uid1", "uid2"],
  "title": "Event tomorrow",
  "body": "Wedding Photography is scheduled for 2026-08-29.",
  "data": { "type": "event_reminder", "entity_id": "evt123" },
  "click_action": "/events/evt123"
}
```

**Logic:**
1. Query `fcm_tokens` where `user_id IN user_ids` AND `is_active == true`
2. For each token, send FCM message via Firebase Admin SDK
3. Handle invalid/expired tokens (mark `is_active = false`)
4. Return success/failure count

**Dependencies:** `firebase-admin` (messaging)

---

## 7. Offline Data Sync — Cross-Device (On/Offline)

> KRAMAS already has partial offline support (`public/sw.js`, `src/components/common/OfflineBanner.jsx`, `src/lib/storageService.js`). Firebase makes this native and automatic. This is a **core requirement** — photographers and event teams often work at venues with poor/no internet.

### 7.1 How Firebase Handles Offline Sync

| Feature | How It Works | KRAMAS Use Case |
|---------|-------------|-----------------|
| **Firestore Offline Persistence** | SDK caches documents in IndexedDB (web) / SQLite (mobile). Reads work offline. Writes queued locally, synced when online. | Photographer at a wedding venue with no WiFi — can still view event details, client info, team assignments. Writes (add payment, update notes) queue and sync when back online. |
| **Auth Session Persistence** | Firebase Auth tokens persist across sessions and devices. `browserLocalPersistence` (default) keeps user logged in. | User logs in on desktop, switches to phone — stays logged in on both. |
| **Realtime Listeners (onSnapshot)** | `onSnapshot` listeners fire for local cache changes immediately, then server changes when online. | Dashboard events list updates instantly on the current device (local write), then propagates to other devices when synced. |
| **Pending Writes Queue** | All writes while offline are queued with metadata. On reconnect, writes are sent to server in order. | Recording a client payment offline → automatically synced when network returns, no manual retry. |
| **Conflict Resolution** | Default: last-write-wins (server timestamp). Can use `serverTimestamp()` for deterministic ordering. | Two team members edit the same event — last save wins, with server timestamps for accuracy. |
| **Offline Queries** | Queries run against local cache if server is unreachable. Results may be incomplete but app stays functional. | Searching clients while offline shows cached results; full results load when online. |
| **Multi-Tab Sync** | `persistentMultipleTabManager` syncs cache across browser tabs on same device. | User has KRAMAS open in 2 tabs — edit in one, other tab updates instantly. |

### 7.2 Configuration — Enable Offline Persistence

**File: `src/lib/firebaseConfig.js` (update)**

```javascript
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);

// Enable offline persistence for Firestore (multi-tab support)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // sync across browser tabs
  })
});

// Auth persists across sessions/devices
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.warn);

export { app, db, auth };
```

### 7.3 Offline-Aware Query Pattern (replace Base44 subscriptions)

**Current (Base44):**
```javascript
useEffect(() => {
  const unsubscribe = base44.entities.Event.subscribe((event) => { /* ... */ });
  return unsubscribe;
}, []);
```

**Firebase (offline + realtime):**
```javascript
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

useEffect(() => {
  const q = query(collection(db, "events"), where("workspace_id", "==", workspaceId));
  // Works offline: reads from cache, syncs when online
  const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const isFromCache = change.doc.metadata.fromCache;
      // isFromCache = true → local/offline, false → server
    });
  });
  return unsubscribe;
}, [workspaceId]);
```

### 7.4 Detecting Online/Offline State

**File: `src/hooks/useOnlineStatus.js` (new)**

```javascript
import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
```

**Usage in `OfflineBanner.jsx` (update):**
```javascript
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 text-sm text-center">
      You're offline. Changes will sync when you reconnect.
    </div>
  );
}
```

### 7.5 Pending Writes Indicator (optional enhancement)

Show users how many writes are queued offline:

```javascript
import { useFirestore } from "firebase/firestore";

function PendingWritesBadge() {
  const { pendingWrites } = useFirestore();
  if (pendingWrites === 0) return null;
  return (
    <span className="badge">{pendingWrites} pending sync</span>
  );
}
```

### 7.6 Files to Create/Update for Offline Sync

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/firebaseConfig.js` | Update | Enable `persistentLocalCache` + multi-tab manager |
| `src/hooks/useOnlineStatus.js` | **Create** | Online/offline detection hook |
| `src/components/common/OfflineBanner.jsx` | Update | Use `useOnlineStatus` hook |
| `src/hooks/useRealtimeSync.js` | Update | Replace Base44 subscriptions with Firestore `onSnapshot` |
| `public/sw.js` | Update | Cache static assets for offline page loads |

### 7.7 Offline Sync Checklist for Codex

```
□ 1. Enable Firestore persistentLocalCache in firebaseConfig.js
□ 2. Enable multi-tab sync (persistentMultipleTabManager)
□ 3. Set Auth persistence to browserLocalPersistence
□ 4. Create useOnlineStatus hook
□ 5. Update OfflineBanner to use useOnlineStatus
□ 6. Replace all base44.entities.X.subscribe() with Firestore onSnapshot()
□ 7. Add includeMetadataChanges to show cache vs server indicator (optional)
□ 8. Update service worker to cache app shell for offline page loads
□ 9. Test: disconnect network → create event → reconnect → verify sync
□ 10. Test: open app in 2 tabs → edit in one → verify real-time update in other
□ 11. Test: login on desktop → open on phone → verify data synced
□ 12. Test: record payment offline → reconnect → verify payment saved
```

---

## 8. Frontend Changes — FCM & Push

### 8.1 Files to Create

- [ ] `src/lib/firebaseMessaging.js` — FCM token request, permission, foreground handler
- [ ] `public/firebase-messaging-sw.js` — Background message service worker

### 8.2 Files to Update

- [ ] `src/lib/firebaseConfig.js` — Add `vapidKey`, export `messaging`
- [ ] `src/lib/AuthContext.jsx` — Call `requestNotificationPermission()` on login
- [ ] `src/components/layout/NotificationBell.jsx` — Show foreground push notifications
- [ ] `src/main.jsx` — Register `firebase-messaging-sw.js`

### 8.3 FCM Token Flow

```
User logs in
  → requestNotificationPermission()
  → Notification.requestPermission()
  → getToken(messaging, { vapidKey })
  → base44.functions.invoke('registerFcmToken', { token, device_type: 'web' })
  → Token saved in fcm_tokens collection

On token refresh:
  → onTokenRefresh(messaging)
  → Re-register new token

Foreground message:
  → onMessage(messaging, (payload) => { show in-app toast/banner })

Background message:
  → firebase-messaging-sw.js handles it
  → Shows system notification
```

---

## 9. Security Rules (Firestore & Storage)

### 9.1 Firestore Rules Pattern

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: is user authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: is admin (platform-level)
    function isAdmin() {
      return isAuth() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users — own profile only
    match /users/{userId} {
      allow read: if isAuth() && (request.auth.uid == userId || isAdmin());
      allow create: if isAuth() && request.auth.uid == userId;
      allow update: if isAuth() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    // Workspaces — owner only
    match /workspaces/{workspaceId} {
      allow read: if isAuth() && resource.data.owner_user_id == request.auth.uid;
      allow create: if isAuth() && request.resource.data.owner_user_id == request.auth.uid;
      allow update, delete: if isAuth() && resource.data.owner_user_id == request.auth.uid;
    }

    // Workspace-scoped collections — member check + created_by_id
    match /clients/{docId} {
      allow read, update, delete: if isAuth() && resource.data.created_by_id == request.auth.uid;
      allow create: if isAuth() && request.resource.data.created_by_id == request.auth.uid;
    }

    // (Repeat similar pattern for all workspace-scoped collections)
    // Collections: events, team_members, team_roles, team_block_dates,
    //   event_team_assignments, services, quotations, quotation_items,
    //   financial_transactions, expense_categories, event_reminders

    // Notifications — user sees only their own
    match /notifications/{docId} {
      allow read, update, delete: if isAuth() && resource.data.user_id == request.auth.uid;
      allow create: if isAdmin();
    }

    // Plans — public read, admin write
    match /plans/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /plan_pricings/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /plan_limits/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // FCM tokens — own tokens only
    match /fcm_tokens/{docId} {
      allow read, write: if isAuth() && resource.data.user_id == request.auth.uid;
      allow create: if isAuth() && request.resource.data.user_id == request.auth.uid;
    }

    // Storage usage — admin only
    match /storage_usage/{docId} {
      allow read, write: if isAdmin();
    }
  }
}
```

### 9.2 Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Workspace files — workspace member check
    match /workspaces/{workspaceId}/{allPaths=**} {
      allow read, write: if request.auth != null;
      // TODO: Add workspace membership check
    }

    // Public quotation files (client-facing)
    match /public/quotations/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 10. Data Migration Steps

### 10.1 Export from Base44

```bash
# For each entity, export via Base44 SDK:
# 1. List all records (paginate if > 200)
# 2. Transform to Firestore document format
# 3. Write to Firestore via Admin SDK batch writes
```

### 10.2 Migration Script (Node.js)

```javascript
// migrate.js (run locally with Firebase Admin SDK)
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'kramashah-XXXXX'
});

const db = admin.firestore();

async function migrateEntity(entityName, records) {
  const batch = db.batch();
  records.forEach((record) => {
    const ref = db.collection(entityName.toLowerCase()).doc(record.id);
    batch.set(ref, {
      ...record,
      created_date: admin.firestore.Timestamp.fromDate(new Date(record.created_date)),
      updated_date: admin.firestore.Timestamp.fromDate(new Date(record.updated_date))
    });
  });
  await batch.commit();
  console.log(`Migrated ${records.length} ${entityName} records`);
}

// Run for each entity:
// migrateEntity('Workspace', workspaceRecords);
// migrateEntity('Client', clientRecords);
// ... etc
```

### 10.3 Migration Order (dependency-safe)

1. `users` (Firebase Auth import)
2. `workspaces`
3. `workspace_members`
4. `plans` → `plan_pricings` → `plan_limits`
5. `workspace_subscriptions` → `subscription_payments`
6. `clients`
7. `events`
8. `team_members` → `team_roles` → `team_block_dates`
9. `event_team_assignments`
10. `services`
11. `quotations` → `quotation_items`
12. `financial_transactions` → `expense_categories`
13. `event_reminders`
14. `notifications`
15. `upgrade_requests`
16. `storage_usage`
17. `fcm_tokens` (new — users re-register on next login)

---

## 11. Known Issues & Limitations

| # | Issue | Impact | Resolution |
|---|-------|--------|-----------|
| 1 | Base44 has no phone-auth session API | Phone-verified users can't get Base44 session token | Firebase Auth handles natively after migration |
| 2 | Google OAuth not configured | Google login fails | Configure in Firebase Auth → Google provider |
| 3 | Firebase Phone OTP not configured | Phone login fails | Enable Phone provider in Firebase Auth |
| 4 | PWA icons not supplied | PWA install shows default icon | Add icons in `public/` (192x192, 512x512) |
| 5 | Razorpay keys not set | Payment gateway fails | Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| 6 | Stripe keys not set | Stripe payment fails (optional) | Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| 7 | FCM not configured | Push notifications fail | Set Firebase service account secrets + VAPID key |
| 8 | No scheduled tasks running | Notifications not auto-generated | Deploy Cloud Scheduler + scheduled functions |
| 9 | `verifyFirebaseToken` function exists but session not issued | Phone users verified but not logged in | Firebase Auth migration resolves this |
| 10 | Storage tracking uses Base44 UploadFile | Storage limits not enforced in Firebase | Use Storage `onFinalize` trigger + `storage_usage` collection |
| 11 | Offline sync partial (service worker only) | Data not accessible without internet | Enable Firestore `persistentLocalCache` (see Section 7) |
| 12 | No cross-device realtime sync | Changes on one device not seen on another | Firestore `onSnapshot` listeners (see Section 7) |

---

## Appendix A: File-to-Service Mapping

| Current File | Firebase Equivalent |
|--------------|-------------------|
| `base44/entities/*.jsonc` | Firestore collections + security rules |
| `base44/functions/*/entry.ts` | `functions/src/*.ts` (Cloud Functions) |
| `base44/shared/*.ts` | `functions/src/shared/*.ts` |
| `src/lib/firebaseConfig.js` | Update with real Firebase config + offline persistence |
| `src/lib/firebaseAuth.js` | Keep — Firebase Phone Auth |
| `src/lib/firebaseMessaging.js` | **NEW** — FCM setup |
| `public/firebase-messaging-sw.js` | **NEW** — FCM background handler |
| `src/hooks/useOnlineStatus.js` | **NEW** — Online/offline detection |
| `src/api/base44Client.js` | Replace with Firebase SDK imports |

---

## Appendix B: Quick Setup Checklist for Codex

```
□ 1. Create Firebase project + web app
□ 2. Enable Auth (email/password, Google, Phone)
□ 3. Enable Firestore (production mode)
□ 4. Enable Storage
□ 5. Enable Cloud Messaging + generate VAPID key
□ 6. Generate service account key (JSON)
□ 7. Set environment secrets (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
□ 8. Create all 24 Firestore collections (see Section 5)
□ 9. Deploy Firestore security rules (see Section 9)
□ 10. Deploy Storage security rules
□ 11. Create all Cloud Functions (see Section 6)
□ 12. Set up Cloud Scheduler for scheduled functions
□ 13. Update src/lib/firebaseConfig.js with real config + vapidKey + offline persistence
□ 14. Create src/lib/firebaseMessaging.js
□ 15. Create public/firebase-messaging-sw.js
□ 16. Create src/hooks/useOnlineStatus.js
□ 17. Update OfflineBanner to use useOnlineStatus
□ 18. Replace Base44 subscriptions with Firestore onSnapshot (offline sync)
□ 19. Update AuthContext to request notification permission
□ 20. Migrate existing data from Base44 (see Section 10)
□ 21. Test: auth, CRUD, push notifications, payments, AI agent
□ 22. Test: offline mode (disconnect → create data → reconnect → verify sync)
□ 23. Test: cross-device sync (login on 2 devices → edit on one → verify on other)
□ 24. Set up Razorpay/Stripe keys
□ 25. Set up Gemini API key for agentChat
□ 26. Enable Firebase Hosting + Cloud Tasks (Phase 1 additional services)
□ 27. Enable Analytics, Performance, Remote Config, App Check, Crashlytics (Phase 2)
```

---

**Document Version:** 2.0  
**Last Updated:** 2026-08-28  
**App:** KRAMAS (kramashah.base44.app)  
**Target:** Firebase full migration with offline sync