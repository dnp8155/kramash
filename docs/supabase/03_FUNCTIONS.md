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
| `get_client_portal_data_by_access(p_token)` | Client portal data via access token | `p_token TEXT` | JSONB | `getClientPortalDataByAccess` |
| `verify_client_portal_access(p_token, p_password)` | Verify client portal password | `p_token TEXT, p_password TEXT` | JSONB | `verifyClientPortalAccess` |
| `enable_client_portal_access(p_client_id)` | Enable client portal + generate token | `p_client_id UUID` | JSONB | `enableClientPortalAccess` |
| `update_client_portal_password(p_client_id, p_password)` | Update client portal password | `p_client_id UUID, p_password TEXT` | JSONB | `updateClientPortalPassword` |
| `get_team_portal_data(p_user_id)` | Authenticated team portal data | (none — uses `auth.uid()`) | JSONB | `getTeamPortalData` |
| `get_team_portal_data_by_access(p_token)` | Team portal data via access token | `p_token TEXT` | JSONB | `getTeamPortalDataByAccess` |
| `verify_team_portal_access(p_token, p_password)` | Verify team portal password | `p_token TEXT, p_password TEXT` | JSONB | `verifyTeamPortalAccess` |
| `enable_team_portal_access(p_team_member_id)` | Enable team portal + generate token | `p_team_member_id UUID` | JSONB | `enableTeamPortalAccess` |
| `update_team_portal_password(p_team_member_id, p_password)` | Update team portal password | `p_team_member_id UUID, p_password TEXT` | JSONB | `updateTeamPortalPassword` |
| `get_public_profile(p_slug)` | Public business profile data | `p_slug TEXT` | JSONB | `getPublicProfile` |
| `create_lead(p_workspace_id, p_data)` | Create lead with workspace scoping | Various | JSONB | `createLead` |
| `edit_transaction(p_transaction_id, p_data)` | Edit existing financial transaction | Various | JSONB | `editTransaction` |
| `void_transaction(p_transaction_id)` | Void a transaction (status=VOID, reverse balances) | `p_transaction_id UUID` | JSONB | `voidTransaction` |
| `delete_transaction(p_transaction_id)` | Delete a transaction (only if VOID) | `p_transaction_id UUID` | JSONB | `deleteTransaction` |
| `get_push_config()` | Get VAPID public key for web push | (none — uses `auth.uid()`) | JSONB | `getPushConfig` |
| `register_push_subscription(p_subscription)` | Store push subscription credentials | Various | JSONB | `registerPushSubscription` |
| `dispatch_push_notification(p_user_id, p_title, p_body)` | Send push notification to user's devices | Various | JSONB | `dispatchPushNotification` |

---

## 9. Edge Functions

### Complete Backend Function Registry (52 functions)

#### Auth & User Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 1 | `sendOtp` | Send phone OTP via external provider | None | `PhoneLogin.jsx` | Edge Function or Supabase phone OTP |
| 2 | `verifyOtp` | Verify phone OTP from in-memory store | None | `PhoneLogin.jsx` | Edge Function or Supabase phone OTP |
| 3 | `verifyFirebaseToken` | Verify Firebase ID token, look up user by phone | None | `PhoneLogin.jsx` | PROPOSED — Edge Function |
| 4 | `generateWebAuthnRegistrationChallenge` | Generate WebAuthn registration challenge for app lock | `user` | `AppLockScreen.jsx` | Edge Function |
| 5 | `verifyWebAuthnRegistration` | Verify WebAuthn registration attestation, store credential | `user` | `AppLockScreen.jsx` | Edge Function |
| 6 | `generateWebAuthnAssertionChallenge` | Generate WebAuthn assertion challenge for app lock unlock | `user` | `AppLockScreen.jsx` | Edge Function |
| 7 | `verifyWebAuthnAssertion` | Verify WebAuthn assertion signature, unlock app | `user` | `AppLockScreen.jsx` | Edge Function |

#### Client Portal Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 8 | `getClientPortalData` | Authenticated client portal data | `client` | `ClientPortal.jsx` | RPC `get_client_portal_data` |
| 9 | `getClientPortalDataByAccess` | Client portal data via access token (password-less) | None (token) | `ClientPortal.jsx` | RPC `get_client_portal_data_by_access` |
| 10 | `verifyClientPortalAccess` | Verify client portal password, return session token | None (token+password) | `ClientPasswordLogin.jsx` | Edge Function |
| 11 | `enableClientPortalAccess` | Enable/disable client portal + generate token & password hash | `user` | `PortalAccessSection.jsx` | RPC `enable_client_portal_access` |
| 12 | `updateClientPortalPassword` | Update client portal password | `user` | `PortalAccessSection.jsx` | RPC `update_client_portal_password` |
| 13 | `getPortalData` | Public quotation portal data (token-based) | None | `ClientProjectPortal.jsx` | RPC `get_portal_data` |
| 14 | `clientViewQuotation` | Public quotation view (token or ID) | None | `ClientQuotationView.jsx` | RPC `client_view_quotation` |
| 15 | `signQuotation` | Client signs quotation online | None (token) | `ClientQuotationView.jsx` | Edge Function |
| 16 | `getPublicInvoice` | Public invoice data (token-based) | None | `PublicInvoice.jsx` | RPC `get_public_invoice` |
| 17 | `getPublicJobSheet` | Public job sheet data (token-based, operational only) | None | `PublicJobSheet.jsx` | RPC `get_public_job_sheet` |
| 18 | `getPublicEventData` | Public event tracking page | None (event ID) | `EventTracking.jsx` | RPC `get_public_event_data` |
| 19 | `getPublicProfile` | Public business profile data (slug-based) | None (slug) | `PublicProfile.jsx` | RPC `get_public_profile` |

#### Quotation & Invoice Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 20 | `createInvoiceFromQuotation` | Create invoice from accepted/finalized quotation | `user` | `QuotationEditor.jsx` | RPC `create_invoice_from_quotation` |
| 21 | `syncQuotationAcceptance` | Sync accepted quotation → Event + Team + Service + Milestones | `user` | `QuotationEditor.jsx` | RPC `sync_quotation_acceptance` |
| 22 | `recordInvoicePayment` | Record client payment against invoice | `user` | `InvoiceEditor.jsx` | RPC `record_invoice_payment` |
| 23 | `recordPayment` | Record team/service payment (blocks self-payment) | `user` | `RecordPaymentDialog.jsx` | RPC `record_team_or_service_payment` |
| 24 | `editTransaction` | Edit existing financial transaction | `user` | `EditTransactionDialog.jsx` | RPC `edit_transaction` |
| 25 | `voidTransaction` | Void a financial transaction (sets status=VOID, reverses balances) | `user` | `Financial.jsx` | RPC `void_transaction` |
| 26 | `deleteTransaction` | Delete a financial transaction (only if VOID) | `user` | `Financial.jsx` | RPC `delete_transaction` |
| 27 | `togglePublicLink` | Toggle quotation public link + hide team names | `user` | `PublicLinkPanel.jsx` | RPC `toggle_public_link` |
| 28 | `toggleInvoicePublicLink` | Toggle invoice public link | `user` | `InvoicePublicLinkPanel.jsx` | RPC `toggle_invoice_public_link` |

#### Team Portal Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 29 | `getTeamPortalData` | Authenticated team member portal data | `team_member` | `TeamMemberPortal.jsx` | RPC `get_team_portal_data` |
| 30 | `getTeamPortalDataByAccess` | Team portal data via access token (password-less) | None (token) | `TeamMemberPortal.jsx` | RPC `get_team_portal_data_by_access` |
| 31 | `verifyTeamPortalAccess` | Verify team portal password, return session token | None (token+password) | `TeamMemberPasswordLogin.jsx` | Edge Function |
| 32 | `enableTeamPortalAccess` | Enable/disable team portal + generate token & password hash | `user` | `TeamPortalAccessSection.jsx` | RPC `enable_team_portal_access` |
| 33 | `updateTeamPortalPassword` | Update team portal password | `user` | `TeamPortalAccessSection.jsx` | RPC `update_team_portal_password` |

#### CRUD Functions (with plan limit enforcement)

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 34 | `createEvent` | Create event with plan limit check | `user` | `EventEditor.jsx` | RPC `create_event` |
| 35 | `createTeamMember` | Create team member with plan limit + auto-color | `user` | `TeamMemberForm.jsx` | RPC `create_team_member` |
| 36 | `createService` | Create service with plan limit check | `user` | `ServiceForm.jsx` | RPC `create_service` |
| 37 | `createTeamAssignment` | Create team assignment (prevents duplicate, SELF guard) | `user` | `AssignTeamDialog.jsx` | RPC `create_team_assignment` |
| 38 | `createLead` | Create lead with workspace scoping | `user` | `LeadForm.jsx` | RPC `create_lead` |

#### AI & Notification Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 39 | `agentChat` | AI assistant with workspace data context | `user` | `AgentBot.jsx` | Edge Function + LLM API |
| 40 | `generateNotifications` | Generate event reminders + subscription expiry notifications | `user` | `AppLayout.jsx` | Edge Function or scheduled cron |

#### Push Notification Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 41 | `getPushConfig` | Get VAPID public key for web push subscription | `user` | `pushService.js` | Edge Function |
| 42 | `registerPushSubscription` | Store per-device push subscription credentials | `user` | `pushService.js` | RPC `register_push_subscription` |
| 43 | `dispatchPushNotification` | Send push notification to a user's devices (admin/server) | `admin` | `generateNotifications` | Edge Function |

#### SaaS Billing Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 44 | `initWorkspaceSubscription` | Initialize Free plan subscription on onboarding | `user` | `Onboarding.jsx` | RPC `init_workspace_subscription` |
| 45 | `assignProSubscription` | Admin assigns Pro plan to workspace | `admin` | `AdminWorkspaceDetails.jsx` | RPC `assign_pro_subscription` |
| 46 | `downgradeToFree` | Admin downgrades workspace to Free | `admin` | `AdminWorkspaceDetails.jsx` | RPC `downgrade_to_free` |
| 47 | `submitUpgradeRequest` | User submits upgrade request | `user` | `YourPlan.jsx` | RPC `submit_upgrade_request` |
| 48 | `createPaymentOrder` | Create Razorpay order for Pro purchase | `user` | `YourPlan.jsx` | Edge Function |
| 49 | `verifyPayment` | Verify Razorpay payment signature + activate Pro | `user` | `YourPlan.jsx` | Edge Function |
| 50 | `trackStorageUsage` | Track per-workspace file storage usage | `user` | Upload flows | RPC `track_storage_usage` |

#### Webhook Handlers

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 51 | `handleStripeWebhook` | Stripe webhook → activate Pro | None (signature) | External (Stripe) | Edge Function |
| 52 | `handleRazorpayWebhook` | Razorpay webhook → activate Pro | None (signature) | External (Razorpay) | Edge Function |

#### Admin Functions

| # | Function Name | Purpose | Auth | Frontend Caller | Supabase Replacement |
|---|---------------|---------|------|-----------------|---------------------|
| 53 | `adminDashboardStats` | Platform-level dashboard statistics | `admin` | `AdminDashboard.jsx` | RPC `admin_dashboard_stats` |
| 54 | `adminListWorkspaces` | List all workspaces with plan + usage | `admin` | `AdminWorkspaces.jsx` | RPC `admin_list_workspaces` |
| 55 | `adminGetWorkspaceDetails` | Detailed workspace info for admin | `admin` | `AdminWorkspaceDetails.jsx` | RPC `admin_get_workspace_details` |
| 56 | `adminSetWorkspaceStatus` | Suspend/unsuspend workspace | `admin` | `AdminWorkspaceDetails.jsx` | RPC `admin_set_workspace_status` |

> **Note:** Function numbers exceed 52 because the original `inviteClientToPortal` (non-existent) was removed and replaced with `enableClientPortalAccess` + `verifyClientPortalAccess` + `updateClientPortalPassword`. The actual function count is 52.

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