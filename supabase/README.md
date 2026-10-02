# Supabase Migration — Setup Guide

## 📋 क्या-क्या बना है

### SQL Migrations (Supabase Dashboard में run करें)
```
supabase/migrations/
├── 0001_enums.sql          → सारे PostgreSQL enums (50+ types)
├── 0002_tables.sql         → 39 PostgreSQL tables (37 entities + profiles + audit_logs)
├── 0003_rls.sql            → RLS policies (हर table पर)
├── 0004_triggers_indexes.sql → Triggers (updated_at, created_by_id, new user) + 60+ indexes
├── 0005_seed_data.sql      → Plans, PlanPricings, PlanLimits (FREE + PRO)
└── 0006_storage_buckets.sql → Storage buckets + policies
```

### Frontend Client
```
src/lib/supabaseClient.js   → Supabase client + entity proxies + auth + storage helpers
```

---

## 🚀 Setup Steps

### Step 1: Supabase Project बनाएं

1. https://supabase.com पर जाएं
2. "New Project" click करें
3. Name: `kramasha`
4. Database Password: strong password choose करें
5. Region: `Mumbai (ap-south-1)` — India के लिए best
6. Plan: Free (start करने के लिए)

### Step 2: SQL Migrations Run करें

Supabase Dashboard → **SQL Editor** में जाएं और इन 6 files को **क्रम में** run करें:

1. `0001_enums.sql` — copy + paste + Run
2. `0002_tables.sql` — copy + paste + Run
3. `0003_rls.sql` — copy + paste + Run
4. `0004_triggers_indexes.sql` — copy + paste + Run
5. `0005_seed_data.sql` — copy + paste + Run
6. `0006_storage_buckets.sql` — copy + paste + Run

> ⚠️ **Important:** क्रम में run करें — tables enums के बिना नहीं बनेंगी, RLS tables के बिना नहीं लगेगा।

### Step 3: Environment Variables सेट करें

Supabase Dashboard → **Settings → API** में जाएं:
- `Project URL` copy करें
- `anon public` key copy करें

अपने app में `.env` file बनाएं (root में):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Auth Configuration

Supabase Dashboard → **Authentication → Providers**:
- **Email** enable करें
- **Google** OAuth provider add करें (Client ID + Secret from Google Cloud Console)
- **Phone** OTP enable करें (अगर phone auth चाहिए)

Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://kramasha.base44.app`
- Redirect URLs: `https://kramasha.base44.app/*`

### Step 5: Storage Buckets Verify

Supabase Dashboard → **Storage** में 3 buckets दिखेंगे:
- `public-assets` (public)
- `private-documents` (private)
- `client-uploads` (private)

---

## 📊 क्या-क्या Store होता है (Quick Reference)

### Tables Overview (39 total)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `profiles` | User profiles (extends auth.users) |
| 2 | `workspaces` | Business workspaces |
| 3 | `workspace_members` | Workspace team members |
| 4 | `clients` | CRM clients |
| 5 | `leads` | CRM leads |
| 6 | `events` | Projects/ events |
| 7 | `team_members` | Team roster |
| 8 | `team_roles` | Team roles with rates |
| 9 | `services` | Service catalog |
| 10 | `service_providers` | External vendors |
| 11 | `event_team_assignments` | Team ↔ Event junction |
| 12 | `event_service_assignments` | Service ↔ Event junction |
| 13 | `event_day_assignments` | Per-day schedule |
| 14 | `team_block_dates` | Team leaves |
| 15 | `event_reminders` | Scheduled reminders |
| 16 | `quotations` | Quotations |
| 17 | `quotation_items` | Quotation line items |
| 18 | `quotation_packages` | Reusable packages |
| 19 | `quotation_portals` | Public portal records |
| 20 | `payment_milestones` | Payment milestones |
| 21 | `invoices` | Invoices |
| 22 | `invoice_items` | Invoice line items |
| 23 | `financial_years` | Financial years |
| 24 | `financial_transactions` | All money flow |
| 25 | `expense_categories` | Expense categories |
| 26 | `job_sheets` | Job sheets |
| 27 | `job_sheet_portals` | Job sheet portal records |
| 28 | `notifications` | In-app notifications |
| 29 | `support_tickets` | Support tickets |
| 30 | `plans` | SaaS plans (FREE, PRO) |
| 31 | `plan_pricings` | Plan pricing options |
| 32 | `plan_limits` | Plan feature limits |
| 33 | `workspace_subscriptions` | Workspace subscriptions |
| 34 | `subscription_payments` | Subscription payments |
| 35 | `upgrade_requests` | Upgrade requests |
| 36 | `storage_usage` | Storage tracking |
| 37 | `user_auth_credentials` | WebAuthn credentials |
| 38 | `push_subscriptions` | Push notification tokens |
| 39 | `audit_logs` | Audit trail (new) |

---

## 🔄 Frontend Migration (Next Phase)

अब SQL schema ready है। अगला step है frontend code को Base44 SDK से Supabase SDK में migrate करना।

### Migration Pattern:

**Before (Base44):**
```js
import { base44 } from '@/api/base44Client';
const events = await base44.entities.Event.list();
```

**After (Supabase):**
```js
import { entities } from '@/lib/supabaseClient';
const events = await entities.Event.list();
```

### Files to Migrate (Phase 2):
- `src/lib/AuthContext.jsx` → Supabase Auth
- `src/pages/Login.jsx` → `supabase.auth.signInWithPassword()`
- `src/pages/Register.jsx` → `supabase.auth.signUp()`
- `src/pages/Events.jsx` → `entities.Event.list()`
- `src/pages/Clients.jsx` → `entities.Client.list()`
- `src/pages/Team.jsx` → `entities.TeamMember.list()`
- `src/pages/Quotation.jsx` → `entities.Quotation.list()`
- `src/pages/Invoices.jsx` → `entities.Invoice.list()`
- `src/pages/Financial.jsx` → `entities.FinancialTransaction.list()`
- ... और सारे pages/ components

---

## ✅ Verification Checklist

Run करने के बाद verify करें:

- [ ] Supabase Dashboard → Table Editor में 39 tables दिखें
- [ ] हर table पर RLS enabled दिखे (green shield icon)
- [ ] Authentication → Users में test user create हो
- [ ] Storage में 3 buckets दिखें
- [ ] SQL Editor में `SELECT * FROM plans;` run करें → 2 rows (FREE, PRO)
- [ ] SQL Editor में `SELECT * FROM plan_pricings;` run करें → 4 rows

---

## 🆘 Common Issues

**"relation already exists"** — tables पहले से बने हैं, drop करके retry करें:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
(⚠️ यह सारा data delete कर देता है — सिर्फ fresh project पर)

**"type already exists"** — enums पहले से हैं:
```sql
DROP TYPE IF EXISTS user_role CASCADE;
```

**"permission denied"** — RLS policies check करें, service role key use करें backend में।

---

## 📞 Next Steps

SQL schema ready है। अब बताएं:
1. **Phase 2:** Frontend auth migration (Login, Register, AuthContext)
2. **Phase 3:** Entity migration (Events, Clients, Team, etc.)
3. **Phase 4:** Backend functions → Supabase Edge Functions
4. **Phase 5:** Data migration script (existing Base44 data → Supabase)

कौन सा phase करना है पहले?