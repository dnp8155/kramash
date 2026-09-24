# Complete Backend Migration — Supabase Edge Functions

## Overview

**ALL 56 Base44 backend functions** have been migrated to **Supabase Edge Functions** (Deno). These run directly on Supabase's infrastructure — no Base44 integration credits required.

## All 56 Functions

### Entity Creation (4)
| Edge Function | Purpose |
|---|---|
| `createEvent` | Create event with plan limit check |
| `createTeamMember` | Create team member with Self + color check |
| `createService` | Create service with plan limit check |
| `createLead` | Create lead with plan limit check |

### Team Management (1)
| `createTeamAssignment` | Assign team member to event (duplicate prevention) |

### Financial Transactions (5)
| `recordPayment` | Team/service provider payment with SELF guard |
| `recordInvoicePayment` | Client payment against invoice (overpayment prevention) |
| `editTransaction` | Edit transaction + reconcile invoice/milestone |
| `voidTransaction` | Soft-delete (VOID) + reconcile |
| `deleteTransaction` | Hard-delete + reconcile |

### Quotation/Invoice (6)
| `createInvoiceFromQuotation` | Create invoice from accepted quotation |
| `signQuotation` | Public: client signs quotation |
| `clientViewQuotation` | Public: quotation view with tracking |
| `syncQuotationAcceptance` | Sync accepted quotation → Event + Team + Milestones |
| `togglePublicLink` | Toggle quotation public portal link (Pro-only) |
| `toggleInvoicePublicLink` | Toggle invoice public link |

### Client Portal (5)
| `enableClientPortalAccess` | Admin enables/disables client portal |
| `verifyClientPortalAccess` | Public: client validates password |
| `getClientPortalData` | Authenticated client portal data |
| `getClientPortalDataByAccess` | Password-only client portal data |
| `updateClientPortalPassword` | Admin regenerates client password |

### Team Portal (5)
| `enableTeamPortalAccess` | Admin enables/disables team portal (Self blocked) |
| `verifyTeamPortalAccess` | Public: team member validates password |
| `getTeamPortalData` | Authenticated team portal data |
| `getTeamPortalDataByAccess` | Password-only team portal data |
| `updateTeamPortalPassword` | Admin regenerates team password |

### Public/Portal Data (5)
| `getPortalData` | Public Client Project Portal (URL 1) |
| `getPublicEventData` | Public event tracking page |
| `getPublicInvoice` | Public invoice view with tracking |
| `getPublicJobSheet` | Public crew job sheet (no financial data) |
| `getPublicProfile` | Public workspace profile by slug |

### Subscription/Payment (8)
| `createPaymentOrder` | Create Razorpay order for Pro |
| `verifyPayment` | Verify Razorpay signature + activate Pro |
| `handleRazorpayWebhook` | Razorpay webhook → activate Pro |
| `handleStripeWebhook` | Stripe webhook → activate Pro |
| `initWorkspaceSubscription` | Create initial Free subscription |
| `assignProSubscription` | Admin assigns Pro subscription |
| `downgradeToFree` | Admin downgrades to Free |
| `submitUpgradeRequest` | Member submits Pro upgrade request |

### Admin (5)
| `adminDashboardStats` | Platform dashboard statistics |
| `adminGetWorkspaceDetails` | Detailed workspace info + plan + usage |
| `adminListWorkspaces` | List all workspaces with plan + usage |
| `adminSetWorkspaceStatus` | Suspend/unsuspend workspace |
| `trackStorageUsage` | Per-workspace storage tracking |

### Notifications/Push (4)
| `generateNotifications` | Generate in-app + email notifications |
| `dispatchPushNotification` | Web push + native push dispatch |
| `registerPushSubscription` | Register/update web push subscription |
| `getPushConfig` | Returns VAPID public key |

### Auth/OTP (3)
| `sendOtp` | Generate + send OTP via SMS provider |
| `verifyOtp` | Validate OTP from in-memory store |
| `verifyFirebaseToken` | Verify Firebase ID token + lookup user |

### WebAuthn (4)
| `generateWebAuthnRegistrationChallenge` | Create challenge for passkey registration |
| `verifyWebAuthnRegistration` | Verify attestation + store credential |
| `generateWebAuthnAssertionChallenge` | Create challenge for passkey login |
| `verifyWebAuthnAssertion` | Verify passkey login assertion |

### AI Agent (1)
| `agentChat` | AI assistant with real workspace data context |

## Shared Modules (`_shared/`)

| Module | Purpose |
|---|---|
| `supabaseClient.ts` | Supabase admin client + user extraction from JWT |
| `planEngine.ts` | Plan resolution, limit checking, workspace membership |
| `paymentEngine.ts` | Stripe/Razorpay verification + Pro activation |
| `portalCrypto.ts` | SHA-256 password hashing + token generation |
| `clientPortalData.ts` | Client portal data builder |
| `teamPortalData.ts` | Team portal data builder |
| `jobSheetData.ts` | Job sheet data builder (no financial data) |
| `transactionReconcile.ts` | Invoice + milestone reconciliation |
| `milestoneAllocation.ts` | Milestone payment allocation |
| `helpers.ts` | round2, invoice totals, snapshots, FY, dates, number-to-words |
| `webauthnCore.ts` | WebAuthn challenge, CBOR decode, assertion verification |
| `webPushCrypto.ts` | Web Push encryption (RFC 8291) + VAPID JWT |
| `otpStore.ts` | In-memory OTP store with expiry |

## Deployment

### Prerequisites

```bash
npm install -g supabase
supabase link --project-ref fyfbpboxdkyxsgjbvqmg
```

### Deploy ALL functions

```bash
# Public functions (no JWT verification)
for fn in verifyClientPortalAccess getClientPortalDataByAccess \
         verifyTeamPortalAccess getTeamPortalDataByAccess \
         signQuotation clientViewQuotation getPortalData \
         getPublicEventData getPublicInvoice getPublicJobSheet \
         getPublicProfile sendOtp verifyOtp verifyFirebaseToken \
         handleRazorpayWebhook handleStripeWebhook; do
  supabase functions deploy $fn --no-verify-jwt
done

# Authenticated functions (JWT verification)
for fn in createEvent createTeamMember createService createLead \
         createTeamAssignment recordPayment recordInvoicePayment \
         editTransaction voidTransaction deleteTransaction \
         createInvoiceFromQuotation syncQuotationAcceptance \
         togglePublicLink toggleInvoicePublicLink \
         enableClientPortalAccess getClientPortalData updateClientPortalPassword \
         enableTeamPortalAccess getTeamPortalData updateTeamPortalPassword \
         createPaymentOrder verifyPayment initWorkspaceSubscription \
         assignProSubscription downgradeToFree submitUpgradeRequest \
         adminDashboardStats adminGetWorkspaceDetails adminListWorkspaces \
         adminSetWorkspaceStatus trackStorageUsage generateNotifications \
         dispatchPushNotification registerPushSubscription getPushConfig \
         generateWebAuthnRegistrationChallenge verifyWebAuthnRegistration \
         generateWebAuthnAssertionChallenge verifyWebAuthnAssertion \
         agentChat; do
  supabase functions deploy $fn
done
```

### Required Secrets (Supabase Edge Function Secrets)

Set these in Supabase Dashboard → Edge Functions → Secrets:

| Secret | Required for | Status |
|---|---|---|
| `SUPABASE_URL` | All functions | Auto-provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Auto-provided by Supabase |
| `RAZORPAY_KEY_ID` | createPaymentOrder, verifyPayment | Already set |
| `RAZORPAY_KEY_SECRET` | createPaymentOrder, verifyPayment | Already set |
| `RAZORPAY_WEBHOOK_SECRET` | handleRazorpayWebhook | Needs setup |
| `STRIPE_SECRET_KEY` | handleStripeWebhook | Needs setup |
| `STRIPE_WEBHOOK_SECRET` | handleStripeWebhook | Needs setup |
| `VAPID_PUBLIC_KEY` | dispatchPushNotification, getPushConfig | Needs setup |
| `VAPID_PRIVATE_KEY` | dispatchPushNotification | Needs setup |
| `VAPID_SUBJECT` | dispatchPushNotification | Optional (has default) |
| `OTP_PROVIDER_API_KEY` | sendOtp, verifyOtp | Needs setup |
| `FIREBASE_API_KEY` | verifyFirebaseToken | Needs setup |
| `OPENAI_API_KEY` | agentChat | Needs setup |
| `BASE44_APP_ID` | WebAuthn challenge tokens | Optional (has fallback) |

### Frontend Integration

**No frontend code changes needed.** The `base44Client.js` compatibility layer already routes `base44.functions.invoke("functionName", ...)` to `supabase.functions.invoke("functionName", ...)`.

All 56 Edge Function directory names exactly match the original Base44 function names (camelCase), so the frontend calls work unchanged.