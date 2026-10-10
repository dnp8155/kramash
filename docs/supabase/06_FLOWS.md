# 06 — Flows: Email, Client Invitation, Portal, Public Links

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 14. Email System

### Current Emails

| # | Email Name | Trigger | Recipient | Subject | Backend Function | Provider |
|---|------------|---------|-----------|---------|-----------------|----------|
| 1 | Client portal invitation | Admin clicks "Invite to Portal" | Client email | "You're invited to access your project portal" | `inviteClientToPortal` | Base44 SendEmail |
| 2 | Event reminder (24h/48h) | `generateNotifications` scans upcoming events | Workspace members | "Event tomorrow: {title}" / "Event coming up: {title}" | `generateNotifications` | Base44 SendEmail |
| 3 | Subscription expiring | `generateNotifications` checks expiry ≤ 7 days | Workspace members | "Pro plan expiring soon" | `generateNotifications` | Base44 SendEmail |
| 4 | Subscription expired | `generateNotifications` detects expired subscription | Workspace members | "Pro plan expired" | `generateNotifications` | Base44 SendEmail |
| 5 | Password reset | User clicks "Forgot Password" | User email | Password reset link | Base44 built-in | Base44 platform |
| 6 | Email verification OTP | User registers | User email | Verification code | Base44 built-in | Base44 platform |

### Email Constraints

- **Registered users:** Always reachable
- **Non-registered users:** Requires paid plan + custom domain (per Base44 constraints)
- **Client invitations:** Currently attempts `SendEmail` to non-registered client emails; if it fails, the registration link is returned for manual sharing

### Target Supabase Email System

| Email | Provider | Trigger | Template |
|-------|----------|---------|----------|
| Client portal invitation | Resend/Postmark | Edge Function `invite-client` | HTML template with registration link |
| Event reminders | Resend/Postmark | Scheduled Edge Function or cron | Plain text + HTML |
| Subscription expiry | Resend/Postmark | Scheduled Edge Function or cron | Plain text + HTML |
| Password reset | Supabase Auth (built-in) | `supabase.auth.resetPasswordForEmail()` | Supabase default template |
| Email verification | Supabase Auth (built-in) | On signup | Supabase default template |

> **Note:** Supabase Auth handles password reset and email verification emails natively. Custom emails (invitations, reminders) require an external transactional email provider.

---

## 15. Client Invitation

### Current Flow

```
Admin (workspace owner)
  ↓
ClientDetails.jsx → "Invite to Portal" button
  ↓
inviteClientToPortal backend function
  ↓
1. Verify admin is workspace owner
2. Build registration URL: /client-register?email={client_email}
3. Try SendEmail to client with registration link
4. If email fails (no custom domain), return link for manual sharing
  ↓
Client receives email (or admin shares link manually)
  ↓
Client clicks link → /client-register?email=...
  ↓
ClientRegister.jsx: email pre-filled (read-only), set password
  ↓
base44.auth.register({ email, password })
  ↓
OTP verification → verifyOtp → setToken
  ↓
Redirect to /client-portal
  ↓
getClientPortalData auto-links by email
```

### Target Supabase Flow

```
Admin (workspace owner)
  ↓
ClientDetails page → "Invite to Portal" button
  ↓
Edge Function: invite-client
  ↓
1. Verify caller is workspace member
2. Build registration URL: /client-register?email={client_email}
3. Send email via Resend/Postmark with registration link
4. Return link for manual sharing if email fails
  ↓
Client clicks link → /client-register?email=...
  ↓
ClientRegister page: email pre-filled, set password
  ↓
supabase.auth.signUp({ email, password })
  ↓
Email verification (Supabase built-in)
  ↓
Client confirms email → redirect to /client-portal
  ↓
getClientPortalData Edge Function auto-links by email
```

### Security Requirements

- Registration link contains only the email (not a token) — the email is pre-filled but the client must still verify email ownership via OTP
- The `getClientPortalData` function verifies email match before auto-linking
- A client can only be linked to ONE Client record per workspace

---

## 16. Client Auto-Link

### Current Logic (`getClientPortalData`)

```typescript
// 1. Get authenticated user
const user = await base44.auth.me();

// 2. Check if already linked
let clientId = user.linked_client_id;
let workspaceId = user.linked_workspace_id;

// 3. If not linked (or role !== 'client'), try auto-link by email
if (user.role !== 'client' || !clientId) {
  const clients = await base44.asServiceRole.entities.Client.filter(
    { email: user.email }, '-created_date', 10
  );
  if (clients && clients.length > 0) {
    clientId = clients[0].id;
    workspaceId = clients[0].workspace_id || workspaceId;

    // Upgrade user role to 'client' and persist link
    await base44.asServiceRole.entities.User.update(user.id, {
      role: 'client',
      linked_client_id: clientId,
      linked_workspace_id: workspaceId
    });
    wasAutoLinked = true;
  }
}

// 4. If still not linked, return error
if (!clientId || !workspaceId) {
  return Response.json({
    error: 'Your account is not linked to any client record.'
  }, { status: 404 });
}
```

### Target Supabase Auto-Link

```sql
CREATE OR REPLACE FUNCTION public.get_client_portal_data()
RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
  v_user RECORD; v_client RECORD; v_workspace RECORD;
  v_auto_linked BOOLEAN := false;
BEGIN
  SELECT * INTO v_user FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF v_user.role = 'client' AND v_user.linked_client_id IS NOT NULL THEN
    SELECT * INTO v_client FROM clients WHERE id = v_user.linked_client_id;
    SELECT * INTO v_workspace FROM workspaces WHERE id = v_user.linked_workspace_id;
  ELSE
    -- Auto-link by email
    SELECT * INTO v_client FROM clients WHERE email = v_user.email LIMIT 1;
    IF FOUND THEN
      UPDATE profiles SET
        role = 'client',
        linked_client_id = v_client.id,
        linked_workspace_id = v_client.workspace_id
      WHERE id = v_user.id;
      v_auto_linked := true;
      SELECT * INTO v_workspace FROM workspaces WHERE id = v_client.workspace_id;
    ELSE
      RAISE EXCEPTION 'Not linked to any client record';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'auto_linked', v_auto_linked,
    'client', jsonb_build_object(...),
    'workspace', jsonb_build_object(...),
    'events', (SELECT jsonb_agg(*) FROM events WHERE client_id = v_client.id),
    'quotations', (SELECT jsonb_agg(*) FROM quotations WHERE client_id = v_client.id),
    'invoices', (SELECT jsonb_agg(*) FROM invoices WHERE client_id = v_client.id),
    'transactions', (SELECT jsonb_agg(*) FROM financial_transactions WHERE client_id = v_client.id AND transaction_type = 'CLIENT_RECEIPT' AND status = 'ACTIVE'),
    'summary', jsonb_build_object(...)
  );
END;
$$ LANGUAGE plpgsql;
```

### Security Requirements

- Auto-link only matches by **exact email** — no fuzzy matching
- If multiple Client records have the same email, the first one (most recent by `created_date`) is linked
- The user's role is upgraded to `client` — this is a one-way transition (client → user is not supported)
- The auto-link is idempotent — if already linked, it skips

### Duplicate Email Handling

- If two clients in different workspaces share the same email, the first match (by `created_date` descending) is linked
- This is a known limitation — workspace owners should ensure unique client emails
- PROPOSED: Add a unique constraint on `(workspace_id, email)` in the `clients` table to prevent duplicates within a workspace

---

## 17. Client Portal

### Data Pipeline (`getClientPortalData`)

```
Input: authenticated user (client role or auto-linkable)
  ↓
Resolve linked_client_id + linked_workspace_id
  ↓
Fetch workspace (for currency, name, logo, contact)
  ↓
Fetch events WHERE workspace_id = ws AND client_id = cl
  ↓
Fetch quotations WHERE workspace_id = ws AND client_id = cl
  ↓
Fetch invoices WHERE workspace_id = ws AND client_id = cl
  ↓
Fetch transactions WHERE workspace_id = ws AND client_id = cl
  AND transaction_type = 'CLIENT_RECEIPT' AND status = 'ACTIVE'
  ↓
Calculate summary:
  totalQuoted = SUM(quotation.grand_total) WHERE status IN (accepted, finalized)
  totalInvoiced = SUM(invoice.grand_total)
  totalPaid = SUM(transaction.amount)
  balanceDue = MAX(0, totalInvoiced - totalPaid)
  ↓
Return: { auto_linked, client, workspace, summary, events, quotations, invoices, transactions }
```

### Summary Calculations

| Metric | Calculation |
|--------|-------------|
| `totalEvents` | Count of events for this client |
| `totalQuoted` | Sum of `grand_total` for quotations with status `accepted` or `finalized` |
| `totalInvoiced` | Sum of `grand_total` for all invoices |
| `totalPaid` | Sum of `amount` for all ACTIVE CLIENT_RECEIPT transactions |
| `balanceDue` | `MAX(0, totalInvoiced - totalPaid)` |

### Frontend

`ClientPortal.jsx` renders:
- Header with workspace logo, name, contact
- Summary cards: Total Quoted, Total Invoiced, Total Paid, Balance Due
- Projects section (events with status, contract value)
- Quotations section (with public link access)
- Invoices section (with public link access, amount paid, balance)
- Payment history (transactions with method, date, reference)

---

## 18. Public Links / Tokens

### Token-Based Public URLs

| URL Pattern | Entity | Token Field | Auth Required | Data Exposed |
|-------------|--------|-------------|---------------|--------------|
| `/q/:token` | Quotation | `Quotation.public_token` | None (or password if set) | Full quotation with items, milestones, terms, signature |
| `/portal/:token` | Quotation (portal) | `Quotation.public_token` | None | Project portal: timeline, milestones, team, services |
| `/invoice/:token` | Invoice | `Invoice.public_token` | None | Invoice with items, client, business, payments, bank details |
| `/job-sheet/:token` | JobSheet | `JobSheet.public_token` | None | Operational data only: itinerary, crew, deliverables (NO rates/costs) |
| `/track/:id` | Event | Event ID (not token) | None | Event status, payment progress, team, quotation link |

### Token Generation

```typescript
// 48-character hex token using Web Crypto API
function generateSecureToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

### Token Security

- **Length:** 48 hex characters (192 bits of entropy)
- **Generation:** `crypto.getRandomValues()` — cryptographically secure
- **Storage:** Stored on the entity record (`public_token` field)
- **Not enumerable:** No API to list tokens — must know the exact token
- **Revocation:** Admin sets `public_link_enabled = false` → public endpoint returns "unavailable"
- **No expiration:** Tokens don't expire (admin controls via `public_link_enabled`)

### View Tracking

All public endpoints record view tracking (non-blocking):
- `portal_view_count` — incremented on each view
- `portal_first_viewed_at` — set on first view
- `portal_latest_viewed_at` — updated on each view

Admin previews pass `skip_tracking: true` to avoid inflating counts.

### Optional Password Gate

Quotations can have `client_access_password` — if set, the public view requires email + password:
- Email must match `client_snapshot.email`
- Password must match `client_access_password