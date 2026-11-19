# 08 — Migration: Frontend Map, Base44→Supabase, SQL, Seed Data

> Part of `SUPABASE_BACKEND_SPEC.md`. See main file for context.

## 22. Frontend → Backend Mapping

### Authentication Pages

| Frontend Page | Backend Calls |
|--------------|---------------|
| `Login.jsx` | `base44.auth.loginViaEmailPassword()`, `base44.auth.loginWithProvider("google")` |
| `Register.jsx` | `base44.auth.register()`, `base44.auth.verifyOtp()`, `base44.auth.resendOtp()` |
| `ForgotPassword.jsx` | `base44.auth.resetPasswordRequest()` |
| `ResetPassword.jsx` | `base44.auth.resetPassword()` |
| `PhoneLogin.jsx` | `base44.functions.invoke("sendOtp")`, `base44.functions.invoke("verifyOtp")`, `base44.functions.invoke("verifyFirebaseToken")` |
| `ClientLogin.jsx` | `base44.auth.loginViaEmailPassword()` |
| `ClientRegister.jsx` | `base44.auth.register()`, `base44.auth.verifyOtp()` |
| `Onboarding.jsx` | `base44.entities.Workspace.create()`, `base44.functions.invoke("initWorkspaceSubscription")` |

### Main App Pages

| Frontend Page | Backend Calls |
|---------------|---------------|
| `Dashboard.jsx` | `base44.entities.Event.filter()`, `base44.entities.FinancialTransaction.filter()`, `base44.functions.invoke("generateNotifications")` |
| `Events.jsx` | `base44.entities.Event.filter()`, `base44.entities.Client.filter()` |
| `EventEditor.jsx` | `base44.functions.invoke("createEvent")`, `base44.entities.Event.update()` |
| `EventDetails.jsx` | `base44.entities.Event.get()`, `base44.entities.EventTeamAssignment.filter()`, `base44.entities.EventServiceAssignment.filter()` |
| `Clients.jsx` | `base44.entities.Client.filter()` |
| `ClientDetails.jsx` | `base44.entities.Client.get()`, `base44.entities.Event.filter()`, `base44.functions.invoke("enableClientPortalAccess")` |
| `Team.jsx` | `base44.entities.TeamMember.filter()`, `base44.functions.invoke("createTeamMember")` |
| `Financial.jsx` | `base44.entities.FinancialYear.filter()`, `base44.entities.FinancialTransaction.filter()`, `base44.functions.invoke("recordPayment")` |
| `Quotation.jsx` | `base44.entities.Quotation.filter()` |
| `QuotationEditor.jsx` | `base44.entities.Quotation.create/update()`, `base44.entities.QuotationItem.create/update()`, `base44.functions.invoke("syncQuotationAcceptance")`, `base44.functions.invoke("createInvoiceFromQuotation")` |
| `Invoices.jsx` | `base44.entities.Invoice.filter()` |
| `InvoiceEditor.jsx` | `base44.entities.Invoice.create/update()`, `base44.entities.InvoiceItem.create/update()`, `base44.functions.invoke("recordInvoicePayment")`, `base44.functions.invoke("toggleInvoicePublicLink")` |
| `Preferences.jsx` | `base44.entities.Workspace.get/update()`, `base44.auth.updateMe()` |
| `YourPlan.jsx` | `base44.functions.invoke("createPaymentOrder")`, `base44.functions.invoke("verifyPayment")`, `base44.functions.invoke("submitUpgradeRequest")` |

### Public Pages

| Frontend Page | Backend Calls |
|---------------|---------------|
| `ClientQuotationView.jsx` | `base44.functions.invoke("clientViewQuotation")`, `base44.functions.invoke("signQuotation")` |
| `ClientProjectPortal.jsx` | `base44.functions.invoke("getPortalData")` |
| `PublicInvoice.jsx` | `base44.functions.invoke("getPublicInvoice")` |
| `PublicJobSheet.jsx` | `base44.functions.invoke("getPublicJobSheet")` |
| `EventTracking.jsx` | `base44.functions.invoke("getPublicEventData")` |
| `ClientPortal.jsx` | `base44.functions.invoke("getClientPortalData")` |

### Admin Pages

| Frontend Page | Backend Calls |
|---------------|---------------|
| `AdminDashboard.jsx` | `base44.functions.invoke("adminDashboardStats")` |
| `AdminWorkspaces.jsx` | `base44.functions.invoke("adminListWorkspaces")` |
| `AdminWorkspaceDetails.jsx` | `base44.functions.invoke("adminGetWorkspaceDetails")`, `base44.functions.invoke("assignProSubscription")`, `base44.functions.invoke("downgradeToFree")`, `base44.functions.invoke("adminSetWorkspaceStatus")` |

---

## 23. Base44 → Supabase Mapping

### Platform-Level Mapping

| Base44 | Supabase |
|--------|---------|
| Authentication | Supabase Auth |
| Database Entities | PostgreSQL Tables |
| Backend Functions | Edge Functions / PostgreSQL RPC |
| File Storage | Supabase Storage |
| Permissions (RLS) | PostgreSQL RLS |
| User Roles | `profiles` table + role column |
| Emails | Transactional Email Provider (Resend/Postmark) |
| Scheduled Jobs | pg_cron / Scheduled Edge Functions |
| API Calls | Edge Functions / Server-side calls |
| Public Links | Token-based routes (same pattern) |
| Realtime | Supabase Realtime |
| LLM Integration | Direct API calls from Edge Functions |

### Entity → Table Mapping

| Base44 Entity | Supabase Table |
|---------------|----------------|
| User | `auth.users` + `profiles` |
| Workspace | `workspaces` |
| WorkspaceMember | `workspace_members` |
| Client | `clients` |
| Event | `events` |
| TeamMember | `team_members` |
| TeamRole | `team_roles` |
| Service | `services` |
| ServiceProvider | `service_providers` |
| EventTeamAssignment | `event_team_assignments` |
| EventServiceAssignment | `event_service_assignments` |
| EventDayAssignment | `event_day_assignments` |
| TeamBlockDate | `team_block_dates` |
| EventReminder | `event_reminders` |
| Quotation | `quotations` |
| QuotationItem | `quotation_items` |
| QuotationPackage | `quotation_packages` |
| QuotationPortal | `quotation_portals` |
| PaymentMilestone | `payment_milestones` |
| Invoice | `invoices` |
| InvoiceItem | `invoice_items` |
| FinancialYear | `financial_years` |
| FinancialTransaction | `financial_transactions` |
| ExpenseCategory | `expense_categories` |
| JobSheet | `job_sheets` |
| JobSheetPortal | `job_sheet_portals` |
| Notification | `notifications` |
| Plan | `plans` |
| PlanPricing | `plan_pricings` |
| PlanLimit | `plan_limits` |
| WorkspaceSubscription | `workspace_subscriptions` |
| SubscriptionPayment | `subscription_payments` |
| UpgradeRequest | `upgrade_requests` |
| StorageUsage | `storage_usage` |
| SupportTicket | `support_tickets` |
| PushSubscription | `push_subscriptions` |
| UserAuthCredential | `user_auth_credentials` |

### Function → Edge Function/RPC Mapping

| Base44 Function | Supabase Replacement |
|-----------------|---------------------|
| `sendOtp` | Edge Function `send-otp` |
| `verifyOtp` | Edge Function `verify-otp` |
| `verifyFirebaseToken` | Edge Function `verify-firebase-token` (or Supabase phone OTP) |
| `generateWebAuthnRegistrationChallenge` | Edge Function `generate-webauthn-registration-challenge` |
| `verifyWebAuthnRegistration` | Edge Function `verify-webauthn-registration` |
| `generateWebAuthnAssertionChallenge` | Edge Function `generate-webauthn-assertion-challenge` |
| `verifyWebAuthnAssertion` | Edge Function `verify-webauthn-assertion` |
| `getClientPortalData` | RPC `get_client_portal_data` |
| `getClientPortalDataByAccess` | RPC `get_client_portal_data_by_access` |
| `verifyClientPortalAccess` | Edge Function `verify-client-portal-access` |
| `enableClientPortalAccess` | RPC `enable_client_portal_access` |
| `updateClientPortalPassword` | RPC `update_client_portal_password` |
| `getPortalData` | RPC `get_portal_data` |
| `clientViewQuotation` | RPC `client_view_quotation` |
| `signQuotation` | Edge Function `sign-quotation` |
| `getPublicInvoice` | RPC `get_public_invoice` |
| `getPublicJobSheet` | RPC `get_public_job_sheet` |
| `getPublicEventData` | RPC `get_public_event_data` |
| `getPublicProfile` | RPC `get_public_profile` |
| `createInvoiceFromQuotation` | RPC `create_invoice_from_quotation` |
| `syncQuotationAcceptance` | RPC `sync_quotation_acceptance` |
| `recordInvoicePayment` | RPC `record_invoice_payment` |
| `recordPayment` | RPC `record_team_or_service_payment` |
| `editTransaction` | RPC `edit_transaction` |
| `voidTransaction` | RPC `void_transaction` |
| `deleteTransaction` | RPC `delete_transaction` |
| `togglePublicLink` | RPC `toggle_public_link` |
| `toggleInvoicePublicLink` | RPC `toggle_invoice_public_link` |
| `getTeamPortalData` | RPC `get_team_portal_data` |
| `getTeamPortalDataByAccess` | RPC `get_team_portal_data_by_access` |
| `verifyTeamPortalAccess` | Edge Function `verify-team-portal-access` |
| `enableTeamPortalAccess` | RPC `enable_team_portal_access` |
| `updateTeamPortalPassword` | RPC `update_team_portal_password` |
| `createEvent` | RPC `create_event` (with plan limit check) |
| `createTeamMember` | RPC `create_team_member` (with plan limit + auto-color) |
| `createService` | RPC `create_service` (with plan limit) |
| `createTeamAssignment` | RPC `create_team_assignment` (with duplicate/SELF guard) |
| `createLead` | RPC `create_lead` |
| `agentChat` | Edge Function `agent-chat` |
| `generateNotifications` | Edge Function `generate-notifications` (or scheduled cron) |
| `getPushConfig` | Edge Function `get-push-config` |
| `registerPushSubscription` | RPC `register_push_subscription` |
| `dispatchPushNotification` | Edge Function `dispatch-push-notification` |
| `initWorkspaceSubscription` | RPC `init_workspace_subscription` |
| `assignProSubscription` | RPC `assign_pro_subscription` |
| `downgradeToFree` | RPC `downgrade_to_free` |
| `submitUpgradeRequest` | RPC `submit_upgrade_request` |
| `createPaymentOrder` | Edge Function `create-payment-order` |
| `verifyPayment` | Edge Function `verify-payment` |
| `trackStorageUsage` | RPC `track_storage_usage` |
| `handleStripeWebhook` | Edge Function `handle-stripe-webhook` |
| `handleRazorpayWebhook` | Edge Function `handle-razorpay-webhook` |
| `adminDashboardStats` | RPC `admin_dashboard_stats` |
| `adminListWorkspaces` | RPC `admin_list_workspaces` |
| `adminGetWorkspaceDetails` | RPC `admin_get_workspace_details` |
| `adminSetWorkspaceStatus` | RPC `admin_set_workspace_status` |

### SDK Method Mapping

| Base44 SDK | Supabase SDK |
|------------|-------------|
| `base44.entities.X.list()` | `supabase.from('x').select('*')` |
| `base44.entities.X.filter({})` | `supabase.from('x').select('*').eq(...)` |
| `base44.entities.X.get(id)` | `supabase.from('x').select('*').eq('id', id).single()` |
| `base44.entities.X.create({})` | `supabase.from('x').insert({})` |
| `base44.entities.X.bulkCreate([])` | `supabase.from('x').insert([])` |
| `base44.entities.X.update(id, {})` | `supabase.from('x').update({}).eq('id', id)` |
| `base44.entities.X.bulkUpdate([])` | `supabase.from('x').upsert([])` |
| `base44.entities.X.updateMany({}, {})` | `supabase.from('x').update({}).eq(...)` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.entities.X.deleteMany({})` | `supabase.from('x').delete().eq(...)` |
| `base44.entities.X.subscribe(cb)` | `supabase.channel('x').on('postgres_changes', cb).subscribe()` |
| `base44.asServiceRole.entities.X.*` | `supabase` client with service role key (Edge Function only) |
| `base44.functions.invoke(name, body)` | `supabase.functions.invoke(name, { body })` or `supabase.rpc(name, params)` |
| `base44.integrations.Core.UploadPublicFile({file})` | `supabase.storage.from('bucket').upload(path, file)` |
| `base44.integrations.Core.UploadPrivateFile({file})` | `supabase.storage.from('private-bucket').upload(path, file)` |
| `base44.integrations.Core.SendEmail({})` | External email provider API call from Edge Function |
| `base44.integrations.Core.InvokeLLM({})` | Direct LLM API call from Edge Function |
| `base44.integrations.Core.GenerateImage({})` | Direct image generation API call from Edge Function |
| `base44.integrations.Core.CreateFileSignedUrl({})` | `supabase.storage.from('bucket').createSignedUrl(path, expiry)` |
| `base44.auth.updateMe({ app_lock_enabled })` | `supabase.from('profiles').update({ app_lock_enabled }).eq('id', auth.uid())` |
| WebAuthn registration (browser API + `verifyWebAuthnRegistration`) | Edge Function `verify-webauthn-registration` + insert into `user_auth_credentials` |
| WebAuthn assertion (browser API + `verifyWebAuthnAssertion`) | Edge Function `verify-webauthn-assertion` + verify `user_auth_credentials.counter` |
| `base44.functions.invoke("registerPushSubscription")` | `supabase.from('push_subscriptions').insert({...})` |
| `base44.functions.invoke("dispatchPushNotification")` | Edge Function `dispatch-push-notification` (reads `push_subscriptions`, calls FCM/APNs/Web Push) |

---

## 32. Migration SQL

### PROPOSED Migration File Structure

```
supabase/migrations/
  0001_create_profiles.sql
  0002_create_workspaces.sql
  0003_create_workspace_members.sql
  0004_create_clients.sql
  0005_create_events.sql
  0006_create_team.sql
  0007_create_services.sql
  0008_create_assignments.sql
  0009_create_quotations.sql
  0010_create_invoices.sql
  0011_create_financial.sql
  0012_create_job_sheets.sql
  0013_create_notifications.sql
  0014_create_plans.sql
  0015_create_subscriptions.sql
  0016_create_support_tickets.sql
  0017_create_push_subscriptions.sql
  0018_create_user_auth_credentials.sql
  0019_create_rls_policies.sql
  0020_create_triggers.sql
  0021_create_indexes.sql
  0022_create_rpc_functions.sql
  0023_create_storage_buckets.sql
```

### Example Migration: profiles table

```sql
-- 0001_create_profiles.sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'client')),
  phone TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'hi', 'gu')),
  linked_client_id UUID,
  linked_workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger: create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

> **Note:** The full migration SQL is not included in this document. Each migration file should be created in `supabase/migrations/` and documented here with its purpose. This document explains the structure; the actual SQL lives in versioned migration files.

---

## 33. Seed Data

### Development/Testing Seed Data

| Entity | Seed Content | Purpose |
|--------|-------------|---------|
| `plans` | FREE, PRO | Required for plan resolution |
| `plan_pricings` | Monthly ₹499, Annual ₹4999 | Pro pricing options |
| `plan_limits` | FREE: 10 events, 5 team, 3 services; PRO: unlimited | Plan enforcement |
| `expense_categories` | Travel, Equipment, Marketing, Misc | Default categories |
| `team_member_types` | Bride Side, Groom Side, Common | Wedding photography |

### Production Seed Data

Only `plans`, `plan_pricings`, and `plan_limits` are required in production. All other data is workspace-specific and created by users.

> **Rule:** Never place real credentials or production secrets in seed files.