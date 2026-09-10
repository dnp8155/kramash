# 03 — Functions, RPC & Triggers

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 8. Database Functions / RPC

### PROPOSED PostgreSQL RPC Functions

These would replace the business logic currently in Base44 backend functions.

| Function Name | Purpose | Parameters | Returns | Base44 Equivalent |
|---------------|---------|------------|---------|-------------------|
| `get_client_portal_data()` | Returns all client portal data | (none — uses `auth.uid()`) | JSONB | `getClientPortalData` |
| `get_portal_data(p_token)` | Public quotation portal data | `p_token TEXT` | JSONB | `getPortalData` |
| `get_public_invoice(p_token)` | Public invoice data | `p_token TEXT` | JSONB | `getPublicInvoice` |
| `get_public_job_sheet(p_token)` | Public job sheet data | `p_token TEXT` | JSONB | `getPublicJobSheet` |
| `get_public_event_data(p_event_id)` | Public event tracking | `p_event_id UUID` | JSONB | `getPublicEventData` |
| `create_invoice_from_quotation(...)` | Creates invoice from quotation | Various | JSONB | `createInvoiceFromQuotation` |
| `record_invoice_payment(...)` | Records client payment against invoice | Various | JSONB | `recordInvoicePayment` |
| `record_team_or_service_payment(...)` | Records team/service payment | Various | JSONB | `recordPayment` |
| `sync_quotation_acceptance(...)` | Syncs accepted quotation → Event + Financial | Various | JSONB | `syncQuotationAcceptance` |
| `sign_quotation(...)` | Client signs quotation online | Various | JSONB | `signQuotation` |
| `toggle_public_link(...)` | Toggle quotation public link | Various | JSONB | `togglePublicLink` |
| `toggle_invoice_public_link(...)` | Toggle invoice public link | Various | JSONB | `toggleInvoicePublicLink` |
| `generate_notifications(p_workspace_id)` | Generate in-app notifications | `p_workspace_id UUID` | JSONB | `generateNotifications` |
| `track_storage_usage(...)` | Track file storage usage | Various | JSONB | `trackStorageUsage` |
| `verify_workspace_membership(p_user_id, p_workspace_id)` | Check workspace membership | Various | BOOLEAN | `planEngine.verifyWorkspaceMembership` |
| `resolve_plan_context(p_workspace_id)` | Resolve effective plan + limits | `p_workspace_id UUID` | JSONB | `planEngine.resolvePlanContext` |
| `count_usage(p_workspace_id, p_resource_key)` | Count current resource usage | Various | INTEGER | `planEngine.countUsage` |
| `generate_invoice_number(p_workspace_id)` | Generate sequential invoice number | `p_workspace_id UUID` | TEXT | `invoiceHelpers.generateInvoiceNumber` |
| `compute_invoice_totals(p_items, p_options)` | Calculate invoice totals | JSONB | JSONB | `invoiceHelpers.computeInvoiceTotals` |
| `determine_gst_mode(p_business_state, p_client_state)` | CGST+SGST vs IGST | Various | TEXT | `invoiceHelpers.determineGstMode` |
| `amount_to_words(p_amount)` | Indian number to words | `p_amount NUMERIC` | TEXT | `invoiceHelpers.amountToWords` |
| `derive_invoice_status(p_invoice)` | Derive invoice status from payments | JSONB | TEXT | `invoiceHelpers.deriveInvoiceStatus` |
| `get_financial_year_for_date(p_date)` | Get FY for a date | `p_date DATE` | JSONB | `financialYear.getFinancialYearForDate` |
| `compute_expiry(p_start_date, p_duration_months)` | Compute subscription expiry | Various | DATE | `planEngine.computeExpiry` |
| `activate_pro_from_payment(p_payment_id)` | Activate Pro after verified payment | `p_payment_id UUID` | JSONB | `paymentEngine.activateProFromPayment` |

---

## 9. Edge Functions

### Complete Backend Function Registry (36 functions)

#### Auth & User Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 1 | `sendOtp` | Send phone OTP via external provider | None | `PhoneLogin.jsx` | Edge Function or Supabase phone OTP |
| 2 | `verifyOtp` | Verify phone OTP from in-memory store | None | `PhoneLogin.jsx` | Edge Function or Supabase phone OTP |
| 3 | `verifyFirebaseToken` | Verify Firebase ID token, look up user by phone | None | `PhoneLogin.jsx` | PROPOSED — Edge Function |
| 4 | `inviteClientToPortal` | Send client portal invitation email with registration link | `user` (workspace owner) | `ClientDetails.jsx` | Edge Function + email provider |

#### Client Portal Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 5 | `getClientPortalData` | Authenticated client portal data | `client` | `ClientPortal.jsx` | RPC `get_client_portal_data` |
| 6 | `getPortalData` | Public quotation portal data (token-based) | None | `ClientProjectPortal.jsx` | RPC `get_portal_data` |
| 7 | `clientViewQuotation` | Public quotation view (token or ID) | None | `ClientQuotationView.jsx` | RPC `client_view_quotation` |
| 8 | `signQuotation` | Client signs quotation online | None (token) | `ClientQuotationView.jsx` | Edge Function |
| 9 | `getPublicInvoice` | Public invoice data (token-based) | None | `PublicInvoice.jsx` | RPC `get_public_invoice` |
| 10 | `getPublicJobSheet` | Public job sheet data (token-based, operational only) | None | `PublicJobSheet.jsx` | RPC `get_public_job_sheet` |
| 11 | `getPublicEventData` | Public event tracking page | None (event ID) | `EventTracking.jsx` | RPC `get_public_event_data` |

#### Quotation & Invoice Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 12 | `createInvoiceFromQuotation` | Create invoice from accepted/finalized quotation | `user` | `QuotationEditor.jsx` | RPC `create_invoice_from_quotation` |
| 13 | `syncQuotationAcceptance` | Sync accepted quotation → Event + Team + Service + Milestones | `user` | `QuotationEditor.jsx` | RPC `sync_quotation_acceptance` |
| 14 | `recordInvoicePayment` | Record client payment against invoice | `user` | `InvoiceEditor.jsx` | RPC `record_invoice_payment` |
| 15 | `recordPayment` | Record team/service payment (blocks self-payment) | `user` | `RecordPaymentDialog.jsx` | RPC `record_team_or_service_payment` |
| 16 | `togglePublicLink` | Toggle quotation public link + hide team names | `user` | `PublicLinkPanel.jsx` | RPC `toggle_public_link` |
| 17 | `toggleInvoicePublicLink` | Toggle invoice public link | `user` | `InvoicePublicLinkPanel.jsx` | RPC `toggle_invoice_public_link` |

#### CRUD Functions (with plan limit enforcement)

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 18 | `createEvent` | Create event with plan limit check | `user` | `EventEditor.jsx` | RPC `create_event` |
| 19 | `createTeamMember` | Create team member with plan limit + auto-color | `user` | `TeamMemberForm.jsx` | RPC `create_team_member` |
| 20 | `createService` | Create service with plan limit check | `user` | `ServiceForm.jsx` | RPC `create_service` |
| 21 | `createTeamAssignment` | Create team assignment (prevents duplicate, SELF guard) | `user` | `AssignTeamDialog.jsx` | RPC `create_team_assignment` |

#### AI & Notification Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 22 | `agentChat` | AI assistant with workspace data context | `user` | `AgentBot.jsx` | Edge Function + LLM API |
| 23 | `generateNotifications` | Generate event reminders + subscription expiry notifications | `user` | `AppLayout.jsx` | Edge Function or scheduled cron |

#### SaaS Billing Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 24 | `initWorkspaceSubscription` | Initialize Free plan subscription on onboarding | `user` | `Onboarding.jsx` | RPC `init_workspace_subscription` |
| 25 | `assignProSubscription` | Admin assigns Pro plan to workspace | `admin` | `AdminWorkspaceDetails.jsx` | RPC `assign_pro_subscription` |
| 26 | `downgradeToFree` | Admin downgrades workspace to Free | `admin` | `AdminWorkspaceDetails.jsx` | RPC `downgrade_to_free` |
| 27 | `submitUpgradeRequest` | User submits upgrade request | `user` | `YourPlan.jsx` | RPC `submit_upgrade_request` |
| 28 | `createPaymentOrder` | Create Razorpay order for Pro purchase | `user` | `YourPlan.jsx` | Edge Function |
| 29 | `verifyPayment` | Verify Razorpay payment signature + activate Pro | `user` | `YourPlan.jsx` | Edge Function |
| 30 | `trackStorageUsage` | Track per-workspace file storage usage | `user` | Upload flows | RPC `track_storage_usage` |

#### Webhook Handlers

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 31 | `handleStripeWebhook` | Stripe webhook → activate Pro | None (signature) | External (Stripe) | Edge Function |
| 32 | `handleRazorpayWebhook` | Razorpay webhook → activate Pro | None (signature) | External (Razorpay) | Edge Function |

#### Admin Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 33 | `adminDashboardStats` | Platform-level dashboard statistics | `admin` | `AdminDashboard.jsx` | RPC `admin_dashboard_stats` |
| 34 | `adminListWorkspaces` | List all workspaces with plan + usage | `admin` | `AdminWorkspaces.jsx` | RPC `admin_list_workspaces` |
| 35 | `adminGetWorkspaceDetails` | Detailed workspace info for admin | `admin` | `AdminWorkspaceDetails.jsx` | RPC `admin_get_workspace_details` |
| 36 | `adminSetWorkspaceStatus` | Suspend/unsuspend workspace | `admin` | `AdminWorkspaceDetails.jsx` | RPC `admin_set_workspace_status` |

---

## 10. Triggers

### PROPOSED PostgreSQL Triggers

| Trigger Name | Table | Event | Timing | Function Called | Purpose |
|---------------|-------|-------|--------|-----------------|---------|
| `handle_new_user` | `auth.users` | INSERT | AFTER | `public.handle_new_user()` | Create `profiles` row on user signup |
| `update_updated_at` | ALL tables | UPDATE | BEFORE | `public.update_updated_at()` | Auto-update `updated_at` column |
| `update_invoice_status_on_payment` | `financial_transactions` | INSERT/UPDATE/DELETE | AFTER | `public.recalc_invoice_paid()` | Recalculate invoice `amount_paid`, `balance_due`, `status` |
| `update_milestone_status_on_payment` | `financial_transactions` | INSERT/UPDATE/DELETE | AFTER | `public.recalc_milestone_paid()` | Recalculate milestone `paid_amount`, `status` |
| `sync_event_team_member_ids` | `event_team_assignments` | INSERT/UPDATE/DELETE | AFTER | `public.sync_event_team_member_ids()` | Keep `events.team_member_ids` denormalized array in sync |
| `sync_event_service_ids` | `event_service_assignments` | INSERT/UPDATE/DELETE | AFTER | `public.sync_event_service_ids()` | Keep `events.service_ids` denormalized array in sync |
| `generate_public_token_on_enable` | `quotations` | UPDATE | BEFORE | `public.generate_public_token_if_needed()` | Auto-generate `public_token` when `public_link_enabled` set to true |
| `generate_invoice_public_token_on_enable` | `invoices` | UPDATE | BEFORE | `public.generate_invoice_public_token_if_needed()` | Auto-generate `public_token` when `public_link_enabled` set to true |
| `generate_jobsheet_public_token_on_enable` | `job_sheets` | UPDATE | BEFORE | `public.generate_jobsheet_public_token_if_needed()` | Auto-generate `public_token` when `public_link_enabled` set to true |