# Client Portal — Supabase Edge Functions

## Overview

The client portal backend has been migrated from Base44 SDK functions to **Supabase Edge Functions** (Deno). These run directly on Supabase's infrastructure — no Base44 integration credits required.

## Functions Created

| Edge Function | Replaces Base44 Function | Purpose |
|---|---|---|
| `enableClientPortalAccess` | enableClientPortalAccess | Admin enables/disables portal, generates token + password |
| `verifyClientPortalAccess` | verifyClientPortalAccess | Client validates password at `/client-login/:token` |
| `getClientPortalData` | getClientPortalData | Authenticated user gets portal data (events, quotations, invoices, payments) |
| `getClientPortalDataByAccess` | getClientPortalDataByAccess | Password-only session gets portal data |
| `updateClientPortalPassword` | updateClientPortalPassword | Admin regenerates client portal password |

## Shared Modules

- `_shared/supabaseClient.ts` — Supabase admin client (service role, bypasses RLS) + user extraction from JWT
- `_shared/portalCrypto.ts` — Web Crypto SHA-256 password hashing + token generation
- `_shared/clientPortalData.ts` — Portal data builder + workspace membership verification

## Deployment

### Prerequisites

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref fyfbpboxdkyxsgjbvqmg
   ```

### Deploy all client portal functions

```bash
supabase functions deploy enableClientPortalAccess --no-verify-jwt
supabase functions deploy verifyClientPortalAccess --no-verify-jwt
supabase functions deploy getClientPortalData
supabase functions deploy getClientPortalDataByAccess --no-verify-jwt
supabase functions deploy updateClientPortalPassword
```

> **Note:** `--no-verify-jwt` is used for functions that don't require authentication (verifyClientPortalAccess, getClientPortalDataByAccess). The authenticated functions (enableClientPortalAccess, getClientPortalData, updateClientPortalPassword) require a valid JWT.

### Environment Variables

These are automatically provided by Supabase for Edge Functions:
- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (bypasses RLS)

No additional secrets needed.

## Frontend Integration

The `base44Client.js` compatibility layer already routes `base44.functions.invoke("enableClientPortalAccess", ...)` to `supabase.functions.invoke("enableClientPortalAccess", ...)`.

No frontend code changes needed — the existing pages call the same function names.

## Testing

After deployment, test the flow:

1. Go to Client Details → "Generate Password" → portal access enabled
2. Copy the link + password
3. Open the link in incognito → enter password → portal dashboard loads
4. Verify events, quotations, invoices, and payment history appear