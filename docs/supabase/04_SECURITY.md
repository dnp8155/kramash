# 04 — Security: RLS, Storage & Data Isolation

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 11. RLS Policies

### Current Base44 RLS Patterns

Base44 RLS uses template variables:
- `{{user.id}}` — current user's ID
- `{{user.role}}` — current user's role
- `{{user.data.*}}` — custom user data fields
- `created_by_id` — built-in field on every record
- `data.<field>` — field on the record being accessed

### RLS Pattern Summary

| Pattern | Entities | Rule |
|---------|----------|------|
| **Owner-only (created_by_id)** | Client, EventTeamAssignment, EventServiceAssignment, EventDayAssignment, TeamBlockDate, EventReminder, Quotation, QuotationItem, QuotationPackage, PaymentMilestone, Invoice, InvoiceItem, FinancialYear, FinancialTransaction, ExpenseCategory, JobSheet, TeamRole, TeamMember, Service, ServiceProvider | `created_by_id === user.id` |
| **Workspace owner** | Workspace | `owner_user_id === user.id` |
| **User-scoped** | WorkspaceMember, Notification, SupportTicket | `user_id === user.id` |
| **Workspace membership** | QuotationPortal, JobSheetPortal | `workspace_id ∈ user.data.workspace_ids` OR `role === admin` |
| **Admin-only** | Plan, PlanPricing, PlanLimit, StorageUsage | `role === admin` for write; open for read |
| **Admin + owner hybrid** | WorkspaceSubscription, SubscriptionPayment, UpgradeRequest | Read: `created_by_id === user.id` OR `role === admin`; Write: `role === admin` |
| **Open create** | Event, TeamMember, Service, ServiceProvider | Create: open; Read/Update/Delete: `created_by_id === user.id` |
| **Open read** | Plan, PlanPricing, PlanLimit | Read: open; Write: `role === admin` |

### Target Supabase RLS

For each table, RLS policies must enforce workspace membership:

```sql
-- Example: clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = clients.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = clients.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = clients.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

CREATE POLICY "clients_delete_own" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = clients.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );
```

### Special RLS Cases

#### Client Portal Access

Client-role users access data through the `getClientPortalData` Edge Function (service role), NOT through direct table access. The function:
1. Checks `auth.uid()` → `profiles.role === 'client'`
2. Reads `profiles.linked_client_id` and `profiles.linked_workspace_id`
3. Queries with service role (bypasses RLS) but filters by `client_id` and `workspace_id`
4. Returns only the client's own data

**Security:** The client never gets direct table access. All data flows through the Edge Function which enforces the client_id filter.

#### Public Token Access

Public-facing endpoints (quotation portal, invoice portal, job sheet, event tracking) use service role with token-based lookup:
1. Look up record by `public_token` (48-char hex) or `event_id`
2. Check `public_link_enabled === true`
3. Return only public-safe data (no internal notes, no financial details beyond what's shown)

**Security:** Tokens are 48-character cryptographically random hex strings — not enumerable. `public_link_enabled` is the admin master kill switch.

---

## 12. Storage Buckets

### Current Base44 Storage

Base44 provides two storage modes:
- `UploadPublicFile` → world-readable public URL (`file_url`)
- `UploadPrivateFile` → private storage (`file_uri`), accessed via signed URL

### PROPOSED Supabase Storage Buckets

| Bucket Name | Purpose | Public/Private | Allowed Types | Max Size | Folder Structure | RLS |
|-------------|---------|----------------|---------------|----------|-----------------|-----|
| `workspace-logos` | Business logo images | Public | image/* | 2MB | `{workspace_id}/logo.{ext}` | Workspace members can write; public read |
| `client-signatures` | Quotation signature images | Private | image/png | 1MB | `{quotation_id}/signature.png` | Service role only (Edge Function writes) |
| `workspace-documents` | General workspace documents | Private | pdf, image/* | 10MB | `{workspace_id}/{type}/{filename}` | Workspace members |
| `public-assets` | Public-facing assets (quotation PDFs, etc.) | Public | application/pdf, image/* | 10MB | `{workspace_id}/{type}/{filename}` | Workspace members write; public read |

### Storage Policy Patterns

```sql
-- workspace-logos: workspace members can upload, public can read
CREATE POLICY "logo_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'workspace-logos');

CREATE POLICY "logo_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'workspace-logos'
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );
```

---

## 13. File Uploads

### Current Upload Workflows

| Use Case | Method | Storage | Access | Frontend |
|----------|--------|---------|--------|----------|
| Workspace logo | `UploadPublicFile` | Public | World-readable URL | `Preferences.jsx` |
| Quotation signature | Data URL stored in `Quotation.client_signature` field | DB field | Via public quotation view | `ClientQuotationView.jsx` |
| AI agent file attachments | `UploadPublicFile` → pass `file_urls` to `InvokeLLM` | Public | Temporary | `AgentBot.jsx` |
| Invoice/Quotation PDF generation | Client-side `jsPDF` / `html2canvas` | N/A (download) | N/A | Various |

### Target Supabase Upload Flow

```typescript
// Frontend
const { data, error } = await supabase.storage
  .from('workspace-logos')
  .upload(`${workspaceId}/logo.png`, file, {
    contentType: file.type,
    upsert: true
  });

const { data: { publicUrl } } = supabase.storage
  .from('workspace-logos')
  .getPublicUrl(`${workspaceId}/logo.png`);
```

### Validation Rules

- **MIME types:** Only allowed types per bucket
- **File size:** Enforced at upload time + server-side check
- **File naming:** `{workspace_id}/{type}/{uuid}.{ext}` to prevent collisions
- **Storage quota:** Tracked via `trackStorageUsage` function, enforced against plan limit

---

## 34. Security Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | RLS enabled on all tables | PROPOSED | Must enable RLS on every table in Supabase |
| 2 | No service role key in frontend | PROPOSED | Service role key only in Edge Functions |
| 3 | Secrets protected | Current | All secrets in environment variables, never in code |
| 4 | Authentication verified server-side | Current | All backend functions call `base44.auth.me()` |
| 5 | Authorization verified server-side | Current | `verifyWorkspaceMembership()` on all workspace operations |
| 6 | Storage policies configured | PROPOSED | Must configure storage bucket policies |
| 7 | Public links secured | Current | 48-char crypto tokens, `public_link_enabled` master switch |
| 8 | Webhook signatures verified | Current | HMAC-SHA256 with timing-safe comparison |
| 9 | Input validation | Current | Server-side validation in all backend functions |
| 10 | SQL injection protection | PROPOSED | Parameterized queries in Supabase SDK |
| 11 | XSS considerations | Current | React escapes by default; no dangerouslySetInnerHTML with user input |
| 12 | CSRF considerations | N/A | API uses JWT bearer tokens, not cookies |
| 13 | Rate limiting | Partial | OTP has 30s cooldown; other endpoints PROPOSED |
| 14 | Sensitive data exposure | Current | Public endpoints strip internal notes, financial details |
| 15 | Logs do not expose secrets | Current | OTP never logged, secrets never returned |
| 16 | Users cannot access other workspaces | Current | RLS + `verifyWorkspaceMembership` |
| 17 | Clients cannot access other clients | Current | `getClientPortalData` filters by `linked_client_id` |
| 18 | Self-payment blocked | Current | `is_self` check in `recordPayment` |
| 19 | Overpayment prevented | Current | Amount check in `recordInvoicePayment` |
| 20 | Duplicate invoice prevented | Current | Check in `createInvoiceFromQuotation` |

---

## 35. Data Isolation

### Workspace Isolation

Every business entity has a `workspace_id` field. Access is enforced through:

1. **RLS (Base44):** `created_by_id === user.id` — the user who created the record can access it
2. **Workspace membership verification:** `verifyWorkspaceMembership(user.id, workspace_id)` in backend functions
3. **Service role filtering:** Backend functions using `asServiceRole` explicitly filter by `workspace_id`

### Client Isolation

Client portal users (`role === 'client'`) are isolated through:

1. **Auto-link by email:** `getClientPortalData` matches `user.email` to `clients.email`
2. **Linked IDs:** `profiles.linked_client_id` and `profiles.linked_workspace_id`
3. **Service role filtering:** `getClientPortalData` queries with `client_id = linked_client_id AND workspace_id = linked_workspace_id`
4. **No direct table access:** Clients access data only through the `getClientPortalData` Edge Function

### Enforcement Points

| Boundary | Enforcement |
|----------|-------------|
| Workspace → Workspace | RLS (`created_by_id`) + `verifyWorkspaceMembership` |
| Client → Client | `getClientPortalData` filters by `linked_client_id` |
| User → Workspace | `WorkspaceMember` record check |
| Admin → All | `role === 'admin'` check |
| Public → Entity | `public_token` lookup + `public_link_enabled` check |

### What a Client CANNOT Do

- Access another client's quotations, invoices, or events
- Access workspace internal data (team payments, expenses, internal notes)
- Modify any data (read-only portal)
- Access the admin panel or workspace app

### What a User CANNOT Do

- Access another workspace's data
- Pay themselves as a team member (`SELF_PAYMENT_BLOCKED`)
- Exceed plan limits (`PLAN_LIMIT_REACHED`)
- Create duplicate invoices/assignments
- Record overpayments