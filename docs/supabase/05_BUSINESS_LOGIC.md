# 05 — Business Logic, Enums, Indexes & Validation

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 24. Business Logic

### Invoice Totals Calculation

```typescript
// From invoiceHelpers.ts
function computeInvoiceTotals(items, opts) {
  // 1. Subtotal = SUM(quantity * unit_rate) for all items
  const subtotal = round2(items.reduce((s, it) => s + round2(qty * rate), 0));

  // 2. Discount
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = round2(Math.min(discountValue, subtotal));
  } else {
    const pct = Math.min(Math.max(discountValue, 0), 100);
    discountAmount = round2((subtotal * pct) / 100);
  }

  // 3. Taxable Amount = MAX(0, subtotal - discountAmount)
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));

  // 4. GST
  let gstTotal = 0;
  if (gstApplicable) {
    gstTotal = round2((taxableAmount * gstRate) / 100);
    if (gstMode === "igst") {
      igst = gstTotal;
    } else {
      cgst = round2(gstTotal / 2);
      sgst = round2(gstTotal - cgst);
    }
  }

  // 5. Grand Total = taxableAmount + gstTotal
  const grandTotal = round2(taxableAmount + gstTotal);
}
```

### GST Mode Determination

```typescript
// Same state → CGST + SGST
// Different state → IGST
function determineGstMode(businessState, clientState) {
  if (!businessState || !clientState) return "cgst_sgst";
  return businessState.trim().toLowerCase() === clientState.trim().toLowerCase()
    ? "cgst_sgst"
    : "igst";
}
```

### Invoice Status Derivation

```typescript
function deriveInvoiceStatus(invoice) {
  if (status === "cancelled") return "cancelled";
  if (status === "draft") return "draft";
  if (balance <= 0 && total > 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";
  if (dueDate && dueDate < today) return "overdue";
  return status === "sent" ? "sent" : "due";
}
```

### Payment Allocation

```
CLIENT_RECEIPT transaction created
  ↓
Invoice.amount_paid += transaction.amount
Invoice.balance_due = MAX(0, grand_total - amount_paid)
Invoice.status = deriveInvoiceStatus(...)
  ↓
If linked to milestone:
  Milestone.paid_amount = SUM(transactions for this milestone)
  Milestone.status = paid | partially_paid | due | overdue
```

### Self-Payment Guard

```
When recording a TEAM_PAYMENT or BUSINESS_EXPENSE:
  ↓
Check if the payee (team_member or service provider) is_self === true
  ↓
If is_self: REJECT with "SELF_PAYMENT_BLOCKED"
  ↓
Reason: The workspace owner cannot be paid as an external team member.
  The amount is treated as owner share, not an external payment.
```

### Quotation → Invoice Package Logic

```
For PHOTOGRAPHY / EVENT_MANAGEMENT categories:
  ↓
Non-add-on items → consolidated into a single PACKAGE line item
  (internal team/role items are NEVER shown as invoice line items)
  ↓
Add-on items → shown as separate LINE_ITEM entries
  ↓
For ARCHITECTURE / OTHER categories:
  All items shown as individual LINE_ITEM entries (itemized)
```

### Quotation Acceptance Sync

```
Quotation status = "accepted" + sync_pending = true
  ↓
syncQuotationAcceptance function:
  1. Create or update Event from quotation data
  2. Sync Team Assignments (from team-type quotation items)
  3. Sync Service Assignments (from service-type quotation items)
  4. Resolve Financial Year for event start date
  5. Create/Update Payment Milestone dues
  6. Set quotation.sync_pending = false, sync_completed_at = now
  ↓
Note: Does NOT create any payment transactions (acceptance ≠ payment)
```

### Plan Limit Enforcement

```
Before creating Event / TeamMember / Service:
  ↓
1. resolvePlanContext(workspace_id) → { planCode, limits, subscription }
2. If subscription.status === SUSPENDED → reject
3. countUsage(workspace_id, resource_key) → current count
4. checkResourceLimit(limits, resource_key, current) → { allowed, limit }
5. If !allowed → reject with "PLAN_LIMIT_REACHED"
```

### Financial Year Resolution

```
Indian FY convention: April 1 → March 31
  ↓
For date "2026-09-09":
  Month = 9 (September) ≥ 4 → startYear = 2026, endYear = 2027
  FY = "FY 2026–27" (en-dash)
  start_date = "2026-04-01", end_date = "2027-03-31"
```

### Team Color Auto-Assignment

```
On TeamMember creation:
  ↓
1. If color provided, use it
  2. If not, check existing members' colors
  3. Pick first unused color from palette:
     ["#0d9488","#6366f1","#ec4899","#f59e0b","#8b5cf6","#ef4444",
      "#14b8a6","#f97316","#3b82f6","#84cc16","#a855f7","#06b6d4"]
  4. If all used, cycle through palette by index
```

---

## 25. Status / Enums

### Entity Status Registries

| Entity | Field | Values |
|--------|-------|--------|
| Workspace | `business_category` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, INTERIOR, SALON_BEAUTY, CONSULTING, AGENCY, CATERING, CONTRACTING, OTHER |
| Workspace | `plan_type` | free, pro |
| Workspace | `plan_status` | active, suspended, cancelled |
| Workspace | `date_format` | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| Workspace | `number_format` | indian, western |
| WorkspaceMember | `role` | owner, admin, accountant, manager, staff |
| WorkspaceMember | `status` | active, invited, removed |
| Event | `status` | upcoming, in-progress, completed, postponed, cancelled |
| TeamMember | `status` | active, inactive |
| TeamMember | `rate_type` | Per Event, Per Day, Fixed |
| TeamRole | `rate_type` | Per Event, Per Day, Fixed |
| TeamRole | `status` | active, inactive |
| Service | `rate_type` | Fixed, Per Day, Per Unit |
| Service | `status` | active, inactive |
| ServiceProvider | `status` | active, inactive |
| EventTeamAssignment | `assignment_status` | assigned, removed |
| EventTeamAssignment | `rate_type` | Per Event, Per Day, Fixed |
| EventServiceAssignment | `rate_type` | Fixed, Per Day, Per Unit |
| EventServiceAssignment | `assignment_status` | assigned, removed |
| EventDayAssignment | `status` | planned, confirmed, done, cancelled |
| TeamBlockDate | `status` | active, cancelled |
| EventReminder | `reminder_type` | 24_hours, 48_hours, custom |
| EventReminder | `status` | pending, sent, cancelled |
| Quotation | `status` | draft, finalized, accepted, rejected, expired, cancelled |
| Quotation | `category` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, OTHER |
| Quotation | `discount_type` | percent, fixed |
| Quotation | `gst_mode` | cgst_sgst, igst |
| QuotationItem | `item_type` | service, role, team, custom |
| QuotationItem | `rate_type` | Fixed, Per Day, Per Unit, Per Event |
| QuotationPackage | `category` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, OTHER |
| QuotationPackage | `status` | active, inactive |
| PaymentMilestone | `milestone_type` | percent, fixed |
| PaymentMilestone | `status` | upcoming, due, partially_paid, paid, overdue |
| Invoice | `status` | draft, due, sent, paid, partial, overdue, cancelled |
| Invoice | `invoice_type` | full, milestone, manual |
| Invoice | `milestone_tag` | Advance, Event Day, Final Handover, Full Payment, Custom |
| Invoice | `due_date_type` | due_on_receipt, net_15, net_30, custom |
| Invoice | `discount_type` | percent, fixed |
| Invoice | `gst_mode` | cgst_sgst, igst |
| Invoice | `signature_type` | none, text, esign |
| InvoiceItem | `item_type` | package, line_item |
| FinancialYear | `status` | open, closed |
| FinancialTransaction | `transaction_type` | CLIENT_RECEIPT, TEAM_PAYMENT, BUSINESS_EXPENSE |
| FinancialTransaction | `payment_method` | Cash, UPI, Bank Transfer, Card, Cheque, Other |
| FinancialTransaction | `status` | ACTIVE, VOID |
| ExpenseCategory | `status` | active, inactive |
| JobSheet | `status` | active, archived |
| PushSubscription | `platform` | web, android, ios |
| Notification | `type` | event_reminder, payment_due, subscription_expiring, subscription_expired, team_conflict, general |
| Plan | `code` | FREE, PRO |
| PlanPricing | `billing_cycle` | MONTHLY, SIX_MONTHS, ANNUAL |
| PlanLimit | `limit_key` | max_events, max_team_members, max_services, max_storage_gb, pdf_export_enabled, reminders_enabled |
| WorkspaceSubscription | `status` | ACTIVE, EXPIRED, CANCELLED, SUSPENDED |
| WorkspaceSubscription | `source` | ADMIN, PAYMENT_GATEWAY, PROMOTIONAL, ONBOARDING |
| SubscriptionPayment | `status` | CREATED, SUCCESS, FAILED, REFUNDED |
| UpgradeRequest | `status` | PENDING, APPROVED, REJECTED |
| SupportTicket | `category` | bug, feature_request, billing, account, general |
| SupportTicket | `priority` | low, medium, high, urgent |
| SupportTicket | `status` | open, in_progress, resolved, closed |
| User | `role` | admin, user, client, team_member |
| User | `language` | en, hi, gu |

### PROPOSED PostgreSQL Enums

```sql
CREATE TYPE business_category AS ENUM ('PHOTOGRAPHY', 'EVENT_MANAGEMENT', 'ARCHITECTURE', 'INTERIOR', 'SALON_BEAUTY', 'CONSULTING', 'AGENCY', 'CATERING', 'CONTRACTING', 'OTHER');
CREATE TYPE event_status AS ENUM ('upcoming', 'in-progress', 'completed', 'postponed', 'cancelled');
CREATE TYPE quotation_status AS ENUM ('draft', 'finalized', 'accepted', 'rejected', 'expired', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'due', 'sent', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('CLIENT_RECEIPT', 'TEAM_PAYMENT', 'BUSINESS_EXPENSE');
CREATE TYPE payment_method AS ENUM ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other');
CREATE TYPE user_role AS ENUM ('admin', 'user', 'client', 'team_member');
CREATE TYPE plan_code AS ENUM ('FREE', 'PRO');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE payment_status AS ENUM ('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED');
-- etc.
```

---

## 26. Indexes / Performance

### PROPOSED Indexes

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| `workspaces` | `idx_workspaces_owner` | `owner_user_id` | Find workspace by owner |
| `workspace_members` | `idx_wm_workspace_user` | `(workspace_id, user_id)` | Membership check |
| `workspace_members` | `idx_wm_user` | `user_id` | Find user's workspaces |
| `clients` | `idx_clients_workspace` | `workspace_id` | List clients in workspace |
| `clients` | `idx_clients_email` | `email` | Auto-link by email |
| `events` | `idx_events_workspace` | `workspace_id` | List events in workspace |
| `events` | `idx_events_client` | `(workspace_id, client_id)` | Client's events |
| `events` | `idx_events_start_date` | `(workspace_id, start_date)` | Dashboard sorting |
| `events` | `idx_events_status` | `(workspace_id, status)` | Filter by status |
| `team_members` | `idx_tm_workspace` | `workspace_id` | List team in workspace |
| `team_members` | `idx_tm_workspace_status` | `(workspace_id, status)` | Active members |
| `event_team_assignments` | `idx_eta_event` | `(workspace_id, event_id)` | Assignments for event |
| `event_team_assignments` | `idx_eta_member` | `(workspace_id, team_member_id)` | Member's assignments |
| `event_service_assignments` | `idx_esa_event` | `(workspace_id, event_id)` | Services for event |
| `quotations` | `idx_q_workspace` | `workspace_id` | List quotations |
| `quotations` | `idx_q_client` | `(workspace_id, client_id)` | Client's quotations |
| `quotations` | `idx_q_public_token` | `public_token` | Public portal lookup |
| `quotations` | `idx_q_status` | `(workspace_id, status)` | Filter by status |
| `quotation_items` | `idx_qi_quotation` | `(workspace_id, quotation_id)` | Items for quotation |
| `invoices` | `idx_inv_workspace` | `workspace_id` | List invoices |
| `invoices` | `idx_inv_client` | `(workspace_id, client_id)` | Client's invoices |
| `invoices` | `idx_inv_public_token` | `public_token` | Public invoice lookup |
| `invoices` | `idx_inv_number` | `(workspace_id, invoice_number)` | Number generation |
| `invoice_items` | `idx_ii_invoice` | `(workspace_id, invoice_id)` | Items for invoice |
| `financial_transactions` | `idx_ft_workspace` | `workspace_id` | List transactions |
| `financial_transactions` | `idx_ft_event` | `(workspace_id, event_id)` | Event transactions |
| `financial_transactions` | `idx_ft_client` | `(workspace_id, client_id)` | Client transactions |
| `financial_transactions` | `idx_ft_invoice` | `(workspace_id, invoice_id)` | Invoice payments |
| `financial_transactions` | `idx_ft_milestone` | `(workspace_id, milestone_id)` | Milestone payments |
| `financial_transactions` | `idx_ft_fy` | `(workspace_id, financial_year_id)` | FY transactions |
| `financial_transactions` | `idx_ft_type_date` | `(workspace_id, transaction_type, transaction_date)` | Financial reports |
| `payment_milestones` | `idx_pm_quotation` | `(workspace_id, quotation_id)` | Milestones for quotation |
| `payment_milestones` | `idx_pm_event` | `(workspace_id, event_id)` | Milestones for event |
| `job_sheets` | `idx_js_event` | `(workspace_id, event_id)` | Job sheet for event |
| `job_sheets` | `idx_js_public_token` | `public_token` | Public job sheet lookup |
| `notifications` | `idx_notif_user` | `(user_id, read)` | Unread notifications |
| `workspace_subscriptions` | `idx_ws_workspace_status` | `(workspace_id, status)` | Active subscription |
| `subscription_payments` | `idx_sp_order` | `gateway_order_id` | Webhook lookup |
| `subscription_payments` | `idx_sp_workspace` | `workspace_id` | Payment history |
| `push_subscriptions` | `idx_ps_user` | `user_id` | Find user's push subscriptions |
| `user_auth_credentials` | `idx_uac_user` | `user_id` | Find user's WebAuthn credentials |
| `user_auth_credentials` | `idx_uac_credential_id` | `credential_id` | Lookup by credential ID |

---

## 29. Validation

### Current Validation Rules

| Field | Rule | Enforced In |
|-------|------|-------------|
| Email | Valid email format | Base44 entity schema, `ClientRegister.jsx` |
| Phone | E.164 format (`+91…`) | `sendOtp`, `verifyOtp` |
| Password | Min 6 characters | `Register.jsx`, `ClientRegister.jsx` |
| Amount | > 0 | `recordPayment`, `recordInvoicePayment` |
| Transaction date | Required | `recordPayment`, `recordInvoicePayment` |
| Financial year ID | Required for transactions | `recordPayment`, `recordInvoicePayment` |
| Quotation status | Must be `finalized` or `accepted` to sign | `signQuotation` |
| Quotation status | Must be `accepted` to sync | `syncQuotationAcceptance` |
| Quotation status | Must be `accepted` or `finalized` to invoice | `createInvoiceFromQuotation` |
| Invoice status | Must not be `cancelled` or `draft` for payments | `recordInvoicePayment` |
| Event title, client_id, start_date | Required | `createEvent` |
| Team member name | Required | `createTeamMember` |
| Service name | Required | `createService` |
| Workspace membership | Verified before all workspace-scoped operations | All workspace functions |
| Self-payment | Blocked if `is_self === true` | `recordPayment` |
| Duplicate assignment | Blocked if already assigned | `createTeamAssignment` |
| Duplicate invoice | Blocked if full/milestone invoice exists | `createInvoiceFromQuotation` |
| Overpayment | Blocked if `newPaidAmount > grandTotal` | `recordInvoicePayment` |
| Message length | Max 2000 chars | `agentChat` |

### Target Supabase Validation

- **Database constraints:** CHECK constraints, NOT NULL, UNIQUE
- **Edge Functions:** Server-side validation before database writes
- **PostgreSQL RPC:** Parameter validation within function body
- **Frontend:** Client-side validation (supplementary, not primary)

---

## 30. Transactions / Atomic Operations

### Operations Requiring Atomicity

| Operation | Tables Modified | Current Implementation | Target |
|----------|----------------|----------------------|--------|
| Create invoice from quotation | `invoices`, `invoice_items` | Sequential creates | PostgreSQL transaction in RPC |
| Record invoice payment | `financial_transactions`, `invoices`, `payment_milestones` | Sequential updates | PostgreSQL transaction in RPC |
| Sync quotation acceptance | `events`, `event_team_assignments`, `event_service_assignments`, `payment_milestones`, `quotations` | Sequential creates/updates | PostgreSQL transaction in RPC |
| Activate Pro from payment | `workspace_subscriptions`, `subscription_payments`, `workspaces` | Sequential updates | PostgreSQL transaction in Edge Function |
| Sign quotation | `quotations` (status, signature, signed_at, sync_pending) | Single update | Single update (already atomic) |

### PROPOSED PostgreSQL Transaction Pattern

```sql
CREATE OR REPLACE FUNCTION record_invoice_payment(
  p_workspace_id UUID, p_invoice_id UUID, p_amount NUMERIC,
  p_payment_method TEXT, p_transaction_date DATE,
  p_reference_number TEXT, p_financial_year_id UUID
) RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
  v_txn RECORD; v_invoice RECORD;
  v_new_paid NUMERIC; v_balance NUMERIC; v_new_status TEXT;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_invoice.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot pay cancelled invoice'; END IF;
  IF v_invoice.status = 'draft' THEN RAISE EXCEPTION 'Cannot pay draft invoice'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_new_paid
  FROM financial_transactions
  WHERE invoice_id = p_invoice_id AND transaction_type = 'CLIENT_RECEIPT' AND status = 'ACTIVE';
  v_new_paid := v_new_paid + p_amount;
  IF v_new_paid > v_invoice.grand_total + 0.01 THEN RAISE EXCEPTION 'OVERPAYMENT_PREVENTED'; END IF;

  INSERT INTO financial_transactions (...) VALUES (...) RETURNING * INTO v_txn;

  v_balance := GREATEST(0, v_invoice.grand_total - v_new_paid);
  v_new_status := derive_invoice_status(v_invoice.grand_total, v_new_paid, v_invoice.due_date, v_invoice.status);
  UPDATE invoices SET amount_paid = v_new_paid, balance_due = v_balance, status = v_new_status WHERE id = p_invoice_id;

  RETURN jsonb_build_object('transaction_id', v_txn.id, 'amount_paid', v_new_paid, 'balance_due', v_balance, 'status', v_new_status);
END;
$$ LANGUAGE plpgsql;
```

---

## 31. Idempotency

### Current Idempotency Protections

| Operation | Protection | Implementation |
|----------|-----------|----------------|
| Stripe webhook | Skip if `payment.status === 'SUCCESS'` | `handleStripeWebhook` |
| Razorpay webhook | Skip if `payment.status === 'SUCCESS'` | `handleRazorpayWebhook` |
| Payment verification | Skip if already verified | `verifyPayment` |
| Pro activation | Skip if already activated | `activateProFromPayment` |
| Invoice creation (full) | Check if full invoice exists for quotation | `createInvoiceFromQuotation` |
| Invoice creation (milestone) | Check if milestone invoice exists | `createInvoiceFromQuotation` |
| Invoice payment | Check duplicate reference number | `recordInvoicePayment` |
| Team assignment | Check if already assigned | `createTeamAssignment` |
| Quotation sync | Idempotent — updates existing records | `syncQuotationAcceptance` |
| Subscription init | Check if subscription exists | `initWorkspaceSubscription` |
| Notification generation | Check existing by `user_id:type:entity_id` key | `generateNotifications` |

### Target Supabase Idempotency

- **Unique constraints:** `UNIQUE(workspace_id, invoice_number)`, `UNIQUE(workspace_id, reference_number)` where applicable
- **RPC functions:** Check-before-write pattern within transactions
- **Webhook handlers:** Check `status === 'SUCCESS'` before processing
- **Idempotency keys:** For payment operations, use gateway order ID as natural idempotency key