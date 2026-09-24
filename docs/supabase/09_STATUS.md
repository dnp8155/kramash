# 09 — Status, TODO, Error Handling & Audit Logging

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 27. Audit Logging

### Current State

No dedicated audit log table exists. Activity is inferred from:
- `created_date` / `updated_date` on records
- `created_by_id` on records
- `portal_view_count` / `portal_first_viewed_at` / `portal_latest_viewed_at` on public entities
- `signed_at` / `signed_by_name` on quotations

### PROPOSED Audit Log

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'sign', 'payment', etc.
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Only log security-relevant actions: authentication, role changes, payment recording, public link toggling, quotation signing. Do not log routine reads.

---

## 28. Error Handling

### Current Conventions

All backend functions return JSON responses with consistent error format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_CODE",
  "message": "Detailed explanation",
  "details": "Additional context"
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `Unauthorized` | 401 | Not authenticated |
| `Admin only` | 403 | Not an admin |
| `Not a workspace member` | 403 | Not a member of the workspace |
| `PLAN_LIMIT_REACHED` | 403 | Plan resource limit exceeded |
| `SELF_PAYMENT_BLOCKED` | 403 | Attempted to pay the workspace owner |
| `SELF_ALREADY_ASSIGNED` | 409 | Owner already assigned to this event |
| `ALREADY_ASSIGNED` | 409 | Team member already assigned |
| `DUPLICATE_INVOICE` | 409 | Full invoice already exists for quotation |
| `DUPLICATE_MILESTONE_INVOICE` | 409 | Milestone invoice already exists |
| `DUPLICATE_PAYMENT` | 409 | Payment with same reference number exists |
| `OVERPAYMENT_PREVENTED` | 400 | Payment would exceed invoice total |
| `Token required` | 400 | Missing public token |
| `Quotation not found` | 404 | Token doesn't match any quotation |
| `Invoice not found` | 404 | Token doesn't match any invoice |
| `Webhook not configured` | 503 | Payment gateway not configured |
| `providerStatus: "pending"` | 503 | OTP provider not configured |

### Target Supabase Error Handling

Edge Functions should return consistent JSON:

```typescript
// Success
return new Response(JSON.stringify({ ok: true, data }), { status: 200 });

// Error
return new Response(JSON.stringify({
  error: "Human-readable message",
  code: "MACHINE_CODE"
}), { status: 403 });
```

---

## 36. Implementation Status

| Component | Status |
|-----------|--------|
| **Architecture** | |
| Frontend (React) | [x] Production Ready |
| Backend (Base44) | [x] Production Ready |
| Backend (Supabase) | [ ] Not Started |
| **Authentication** | |
| Email+Password (Base44) | [x] Production Ready |
| Google OAuth (Base44) | [x] Production Ready |
| Phone OTP (Base44) | [x] Analyzed (pending provider credentials) |
| Client Portal Auth (Base44) | [x] Production Ready |
| Supabase Auth migration | [ ] Not Started |
| **Database** | |
| Base44 Entities (37) | [x] Production Ready |
| Supabase Tables | [ ] Not Started |
| Supabase RLS Policies | [ ] Not Started |
| Supabase Triggers | [ ] Not Started |
| Supabase Indexes | [ ] Not Started |
| **Backend Functions** | |
| Base44 Functions (52) | [x] Production Ready |
| Supabase Edge Functions | [ ] Not Started |
| Supabase RPC Functions | [ ] Not Started |
| **File Storage** | |
| Base44 UploadPublicFile | [x] Production Ready |
| Base44 UploadPrivateFile | [x] Production Ready |
| Supabase Storage | [ ] Not Started |
| **Email** | |
| Base44 SendEmail | [x] Production Ready |
| External Email Provider | [ ] Not Started |
| **Payments** | |
| Razorpay Integration | [x] Production Ready (pending credentials) |
| Stripe Integration | [x] Production Ready (pending credentials) |
| Webhook Verification | [x] Production Ready |
| **Public Links** | |
| Quotation Portal | [x] Production Ready |
| Invoice Portal | [x] Production Ready |
| Job Sheet Portal | [x] Production Ready |
| Event Tracking | [x] Production Ready |
| **AI Assistant** | |
| Base44 InvokeLLM | [x] Production Ready |
| Direct LLM API | [ ] Not Started |
| **SaaS Billing** | |
| Plan/Limit System | [x] Production Ready |
| Subscription Management | [x] Production Ready |
| Admin Panel | [x] Production Ready |
| **Migration** | |
| Migration SQL | [ ] Not Started |
| Data Migration Script | [ ] Not Started |
| Testing | [ ] Not Started |

---

## 37. Pending / TODO

### Migration Tasks

- [ ] Create Supabase project and configure auth
- [ ] Create all 37 PostgreSQL tables with proper types
- [ ] Create PostgreSQL enums for all status fields
- [ ] Create RLS policies for all tables
- [ ] Create triggers (handle_new_user, update_updated_at, invoice/milestone payment reconciliation)
- [ ] Create indexes for performance-critical queries
- [ ] Create RPC functions for complex business logic
- [ ] Create Edge Functions for webhook handlers (Stripe, Razorpay)
- [ ] Create Edge Functions for external API calls (LLM, email, OTP)
- [ ] Create Supabase Storage buckets with policies
- [ ] Configure transactional email provider (Resend/Postmark)
- [ ] Configure LLM API access (OpenAI/Anthropic/Google)
- [ ] Migrate frontend from Base44 SDK to Supabase SDK
- [ ] Migrate auth flows from Base44 Auth to Supabase Auth
- [ ] Migrate file uploads from Base44 Core to Supabase Storage
- [ ] Create data migration script (Base44 → Supabase)
- [ ] Set up scheduled jobs (pg_cron or scheduled Edge Functions)
- [ ] Configure Stripe webhook endpoint in Supabase
- [ ] Configure Razorpay webhook endpoint in Supabase
- [ ] Test all authentication flows
- [ ] Test all CRUD operations with RLS
- [ ] Test all public link access
- [ ] Test all payment flows
- [ ] Test client portal auto-link
- [ ] Test plan limit enforcement
- [ ] Test AI assistant with direct LLM API
- [ ] Security audit of RLS policies
- [ ] Performance audit of indexes

### Known Issues to Address

- [ ] Phone OTP provider credentials not configured (returns 503)
- [ ] Firebase phone auth session creation pending (Base44 limitation)
- [ ] Per-user FY viewing preference not implemented
- [ ] Custom domain needed for SendEmail to non-registered users (client invitations)
- [ ] Duplicate client emails across workspaces — auto-link picks first match
- [ ] No audit log table — activity inferred from timestamps
- [ ] No scheduled jobs — `generateNotifications` is on-demand only
- [ ] No rate limiting on most endpoints (only OTP has cooldown)
- [ ] Storage usage tracking is manual (caller must call `trackStorageUsage` after upload)
- [ ] WebAuthn app lock pending secret configuration (functions exist, UI disabled)
- [ ] Push notifications pending VAPID/FCM configuration (functions exist, no credentials)
- [ ] `inviteClientToPortal` referenced in docs but does NOT exist as a backend function — client portal invitations use `enableClientPortalAccess` instead