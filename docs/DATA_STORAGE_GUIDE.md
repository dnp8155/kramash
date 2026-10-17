# Kramasha — Complete Data Storage Guide

> **यह document बताता है कि आपके app में हर data कहाँ store होता है, कौन सी table में, कौन से attributes हैं, और सब कैसे जुड़े हैं।**

---

## 🏗️ Architecture Overview

आपका app **Base44 platform** पर बना है। Base44 में हर data type को **"Entity"** कहते हैं (database table जैसा)। हर entity का schema `base44/entities/<Name>.jsonc` file में defined है।

### कुल 37 Entities हैं — 6 categories में बटे हुए:

| Category | Entities | Purpose |
|----------|----------|---------|
| **1. User & Auth** | User, WorkspaceMember, UserAuthCredential, PushSubscription | लॉगिन, roles, device credentials |
| **2. Workspace & Business** | Workspace, TeamRole, ExpenseCategory, FinancialYear | Business settings, team roles, FY |
| **3. CRM (Clients & Leads)** | Client, Lead, SupportTicket | Customers और potential customers |
| **4. Events & Team** | Event, TeamMember, TeamBlockDate, EventTeamAssignment, EventServiceAssignment, EventDayAssignment, EventReminder | Projects/Events और team scheduling |
| **5. Quotations & Invoices** | Quotation, QuotationItem, QuotationPackage, QuotationPortal, Invoice, InvoiceItem, PaymentMilestone | Quotes, invoices, payments |
| **6. Financial** | FinancialTransaction, SubscriptionPayment, WorkspaceSubscription, UpgradeRequest, StorageUsage, Notification | Money in/out, SaaS billing |
| **7. Services & Portals** | Service, ServiceProvider, JobSheet, JobSheetPortal | Service catalog, job sheets |
| **8. SaaS Admin** | Plan, PlanPricing, PlanLimit | Platform-level plans और pricing |

---

## 🔑 Built-in Fields (हर entity में automatically आते हैं)

ये 5 fields हर entity record में automatically add होते हैं — आपको define करने की जरूरत नहीं:

| Field | Type | क्या है |
|-------|------|--------|
| `id` | string (auto) | Unique ID हर record का |
| `created_date` | datetime (auto) | कब बना |
| `updated_date` | datetime (auto) | कब update हुआ |
| `created_by_id` | string (auto) | किस user ने बनाया |
| `description` | string | Optional description (maxLength: 1000) |

---

## 🔒 Row-Level Security (RLS) — Data Isolation

हर entity में RLS rules हैं जो तय करते हैं कौन सा user कौन सा record देख/ edit/ delete कर सकता है।

### RLS Pattern Types:

**Pattern 1: Owner-only (most common)**
```json
"rls": {
  "create": { "created_by_id": "{{user.id}}" },
  "read": { "created_by_id": "{{user.id}}" },
  "update": { "created_by_id": "{{user.id}}" },
  "delete": { "created_by_id": "{{user.id}}" }
}
```
→ सिर्फ वही user जिसने record बनाया, वही देख/ edit/ delete कर सकता है।
→ इस्तेमाल: Client, Event, TeamMember, Quotation, Invoice, Service, FinancialTransaction, etc.

**Pattern 2: Workspace owner**
```json
"rls": {
  "read": { "data.owner_user_id": "{{user.id}}" },
  "create": { "data.owner_user_id": "{{user.id}}" }
}
```
→ सिर्फ workspace owner access कर सकता है।
→ इस्तेमाल: Workspace

**Pattern 3: Self + Admin**
```json
"rls": {
  "read": {
    "$or": [
      { "created_by_id": "{{user.id}}" },
      { "user_condition": { "role": "admin" } }
    ]
  }
}
```
→ Owner खुद देख सकता है + platform admin भी देख सकता है।
→ इस्तेमाल: QuotationPortal, JobSheetPortal, SubscriptionPayment, UpgradeRequest

**Pattern 4: Admin-only**
```json
"rls": {
  "create": { "user_condition": { "role": "admin" } },
  "read": {}
}
```
→ सिर्फ admin create/ update/ delete कर सकता; read सब कर सकते हैं।
→ इस्तेमास: Plan, PlanPricing, PlanLimit

**Pattern 5: Public read, Admin write**
```json
"rls": {
  "read": {},
  "create": { "user_condition": { "role": "admin" } }
}
```
→ कोई भी authenticated user देख सकता है, सिर्फ admin बना सकता है।
→ इस्तेमाल: Plan

---

## 📋 Entity-by-Entity Complete Breakdown

---

### 1. 👤 User (Built-in)
> Base44 का built-in entity — आप create नहीं कर सकते, users register/ invite से join होते हैं।

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `id` | string | auto | — | User ID |
| `email` | string | auto | — | Login email |
| `full_name` | string | auto | — | Display name |
| `role` | enum | ✅ | — | `admin`, `user`, `client`, `team_member` |
| `phone` | string | ❌ | — | Phone for OTP (E.164: +91...) |
| `language` | enum | ❌ | `en` | `en`, `hi`, `gu` |
| `linked_client_id` | string | ❌ | — | Client-role: linked Client record |
| `linked_team_member_id` | string | ❌ | — | Team_member-role: linked TeamMember |
| `linked_workspace_id` | string | ❌ | — | Client/team_member: workspace |
| `app_lock_enabled` | boolean | ❌ | `false` | WebAuthn app lock on/off |
| `app_lock_relock_after` | number | ❌ | `0` | Re-lock after X minutes |
| `created_date` | datetime | auto | — | Join date |

**Roles explained:**
- `admin` — Platform admin (SaaS admin panel access)
- `user` — Workspace owner (main app user)
- `client` — Client portal user (clients invited by workspace)
- `team_member` — Team member portal user

---

### 2. 🏢 Workspace
> हर business एक workspace है। Register करते ही बनता है।

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `name` | string | ✅ | — | Business name |
| `business_type` | string | ❌ | — | Free-text type |
| `business_category` | enum | ❌ | `OTHER` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, INTERIOR, SALON_BEAUTY, CONSULTING, AGENCY, CATERING, CONTRACTING, OTHER |
| `custom_business_type` | string | ❌ | — | For OTHER category |
| `custom_work_label_singular` | string | ❌ | — | "Project" / "Event" etc. |
| `custom_work_label_plural` | string | ❌ | — | "Projects" / "Events" |
| `owner_user_id` | string | ✅ | — | FK → User.id |
| `tagline` | string | ❌ | — | Business tagline |
| `website` | string | ❌ | — | Website URL |
| `email` | string | ❌ | — | Business email |
| `phone` | string | ❌ | — | Business phone |
| `logo` | string | ❌ | — | Logo URL (public storage) |
| `address` | string | ❌ | — | Full address |
| `city` | string | ❌ | — | City |
| `state` | string | ❌ | — | State (GST mode के लिए) |
| `country` | string | ❌ | — | Country |
| `currency` | string | ❌ | `INR` | Currency code |
| `timezone` | string | ❌ | `Asia/Kolkata` | Timezone |
| `date_format` | enum | ❌ | `DD/MM/YYYY` | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| `number_format` | enum | ❌ | `indian` | indian, western |
| `fy_start_month` | number | ❌ | `4` | Financial year start (1-12) |
| `plan_type` | enum | ❌ | `free` | free, pro |
| `plan_status` | enum | ❌ | `active` | active, suspended, cancelled |
| `gst_enabled` | boolean | ❌ | `false` | GST applicable? |
| `gstin` | string | ❌ | — | GST number |
| `gst_business_name` | string | ❌ | — | GST registered name |
| `gst_billing_address` | string | ❌ | — | GST billing address |
| `gst_state` | string | ❌ | — | GST state |
| `default_gst_rate` | number | ❌ | `18` | Default GST % |
| `team_member_types` | string (JSON) | ❌ | — | JSON array of team types |
| `event_types` | string (JSON) | ❌ | — | JSON array of event types |
| `display_preferences` | string (JSON) | ❌ | — | UI preferences |
| `public_profile_enabled` | boolean | ❌ | `false` | Public profile on/off |
| `public_profile_slug` | string | ❌ | — | URL slug (/p/slug) |
| `public_profile_about` | string | ❌ | — | About text |
| `public_profile_social_links` | string (JSON) | ❌ | — | {instagram, facebook, youtube, website} |

**RLS:** `owner_user_id === user.id` (सिर्फ owner देख/ edit कर सकता)

---

### 3. 👥 WorkspaceMember
> Workspace में multiple users (owner, admin, accountant, manager, staff)

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `user_id` | string | ✅ | — | FK → User |
| `role` | enum | ❌ | `owner` | owner, admin, accountant, manager, staff |
| `status` | enum | ❌ | `active` | active, invited, removed |

**RLS:** `user_id === user.id`

---

### 4. 📞 Client (CRM)
> आपके customers — जिन्हें आप invoice/ quotation भेजते हैं

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Client name |
| `phone` | string | ❌ | — | Primary phone |
| `alternate_phone` | string | ❌ | — | Backup phone |
| `email` | string (email) | ❌ | — | Email (portal auto-link के लिए) |
| `address` | string | ❌ | — | Full address |
| `city` | string | ❌ | — | City |
| `state` | string | ❌ | — | State (GST mode) |
| `country` | string | ❌ | — | Country |
| `notes` | string | ❌ | — | Internal notes |
| `portal_access_token` | string | ❌ | — | Portal login token |
| `portal_password_hash` | string | ❌ | — | salt:hash (never plaintext) |
| `portal_access_enabled` | boolean | ❌ | `false` | Portal on/off |

**RLS:** `created_by_id === user.id`

---

### 5. 🎯 Lead (CRM)
> Potential customers — अभी client नहीं बने, future में convert होंगे

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Lead name |
| `phone` | string | ❌ | — | Phone |
| `email` | string (email) | ❌ | — | Email |
| `source` | enum | ❌ | `other` | referral, social_media, website, walk_in, advertisement, other |
| `event_type` | string | ❌ | — | Interested service type |
| `event_date` | date | ❌ | — | Tentative start date |
| `event_end_date` | date | ❌ | — | Tentative end date |
| `event_dates` | array[date] | ❌ | `[]` | Selected shoot days |
| `budget` | number | ❌ | `0` | Budget |
| `status` | enum | ❌ | `new` | new, contacted, qualified, negotiation, won, lost |
| `priority` | enum | ❌ | `warm` | hot, warm, cold |
| `next_followup_date` | date | ❌ | — | Next follow-up |
| `notes` | string | ❌ | — | Notes |
| `converted_client_id` | string | ❌ | — | FK → Client (if converted) |
| `converted_event_id` | string | ❌ | — | FK → Event (if converted) |

**RLS:** `created_by_id === user.id`

---

### 6. 📅 Event (Project/Work)
> मुख्य entity — हर project/ event/ job यहाँ store होता है

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `client_id` | string | ✅ | — | FK → Client |
| `title` | string | ✅ | — | Event title |
| `event_type` | string | ❌ | — | Type (workspace event_types से) |
| `start_date` | date | ✅ | — | Start date |
| `end_date` | date | ❌ | — | End date |
| `event_dates` | array[date] | ❌ | `[]` | Non-consecutive dates |
| `financial_year` | string | ❌ | — | FY2026-27 format |
| `team_member_ids` | array[string] | ❌ | `[]` | Assigned team IDs |
| `service_ids` | array[string] | ❌ | `[]` | Selected service IDs |
| `venue` | string | ❌ | — | Venue name |
| `venue_address` | string | ❌ | — | Venue address |
| `status` | enum | ❌ | `upcoming` | upcoming, in-progress, completed, postponed, cancelled |
| `contract_value` | number | ❌ | `0` | Agreed total amount |
| `misc_expenses_json` | string (JSON) | ❌ | `[]` | [{name, amount, notes}] |
| `description` | string | ❌ | — | Description |
| `notes` | string | ❌ | — | Internal notes |
| `public_token` | string | ❌ | — | Tracking URL token |
| `public_tracking_enabled` | boolean | ❌ | `false` | Tracking on/off |

**RLS:** `created_by_id === user.id`

---

### 7. 👨‍💼 TeamMember
> आपकी team — photographers, decorators, staff, etc.

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Member name |
| `phone` | string | ❌ | — | Phone |
| `email` | string (email) | ❌ | — | Email |
| `role_id` | string | ❌ | — | FK → TeamRole |
| `profession` | string | ❌ | — | Profession |
| `is_self` | boolean | ❌ | `false` | Owner's own entry |
| `member_type_id` | string | ❌ | — | Legacy type ID |
| `color` | string | ❌ | `#0d9488` | Visual color (hex) |
| `default_rate` | number | ❌ | `0` | Legacy rate |
| `rate_type` | enum | ❌ | `Per Event` | Per Event, Per Day, Fixed |
| `notes` | string | ❌ | — | Notes |
| `status` | enum | ❌ | `active` | active, inactive |
| `portal_access_token` | string | ❌ | — | Portal token |
| `portal_password_hash` | string | ❌ | — | salt:hash |
| `portal_access_enabled` | boolean | ❌ | `false` | Portal on/off |

**RLS:** `created_by_id === user.id`

---

### 8. 🎭 TeamRole
> Team roles with default rates — Preferences में configure होते हैं

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Role name (Photographer, Decorator) |
| `default_rate` | number | ❌ | `0` | Default rate |
| `rate_type` | enum | ❌ | `Per Event` | Per Event, Per Day, Fixed |
| `status` | enum | ❌ | `active` | active, inactive |

**RLS:** `created_by_id === user.id`

---

### 9. 🚫 TeamBlockDate
> Team member की leaves/ unavailable dates

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `team_member_id` | string | ✅ | — | FK → TeamMember |
| `start_date` | date | ✅ | — | Leave start |
| `end_date` | date | ❌ | — | Leave end |
| `reason` | string | ❌ | `Leave` | Reason |
| `status` | enum | ❌ | `active` | active, cancelled |

**RLS:** `created_by_id === user.id`

---

### 10. 🔗 EventTeamAssignment
> कौन सा team member कौन से event में assigned है — per-member rate के साथ

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `event_id` | string | ✅ | — | FK → Event |
| `team_member_id` | string | ✅ | — | FK → TeamMember |
| `role_id` | string | ❌ | — | FK → TeamRole |
| `role_name_snapshot` | string | ❌ | — | Role name (frozen) |
| `member_type_id` | string | ❌ | — | Bride Side/ Groom Side |
| `member_type_snapshot` | string | ❌ | — | Type name (frozen) |
| `agreed_rate` | number | ❌ | `0` | Per-assignment rate |
| `rate_type` | enum | ❌ | `Per Event` | Per Event, Per Day, Fixed |
| `working_dates` | array[date] | ❌ | `[]` | Selected dates |
| `booking_start_date` | date | ❌ | — | Per-member start |
| `booking_end_date` | date | ❌ | — | Per-member end |
| `assignment_status` | enum | ❌ | `assigned` | assigned, removed |
| `notes` | string | ❌ | — | Notes |

**RLS:** `created_by_id === user.id`

---

### 11. 🔗 EventServiceAssignment
> कौन सा service कौन से event में assigned है

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `event_id` | string | ✅ | — | FK → Event |
| `service_id` | string | ✅ | — | FK → Service |
| `service_name_snapshot` | string | ❌ | — | Service name (frozen) |
| `provider_id` | string | ❌ | — | FK → TeamMember (provider) |
| `provider_name_snapshot` | string | ❌ | — | Provider name (frozen) |
| `agreed_rate` | number | ❌ | `0` | Event-specific rate |
| `rate_type` | enum | ❌ | `Fixed` | Fixed, Per Day, Per Unit |
| `is_addon` | boolean | ❌ | `false` | Last-minute add-on? |
| `assignment_status` | enum | ❌ | `assigned` | assigned, removed |
| `notes` | string | ❌ | — | Notes |

**RLS:** `created_by_id === user.id`

---

### 12. 📆 EventDayAssignment
> Per-day schedule — कौन से team members/ services कौन से day पर

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `event_id` | string | ✅ | — | FK → Event |
| `date` | date | ✅ | — | Which date |
| `team_member_ids` | array[string] | ❌ | `[]` | Team members for this day |
| `service_ids` | array[string] | ❌ | `[]` | Services for this day |
| `venue_override` | string | ❌ | — | Per-day venue |
| `notes` | string | ❌ | — | Day notes |
| `status` | enum | ❌ | `planned` | planned, confirmed, done, cancelled |

**RLS:** `created_by_id === user.id`

---

### 13. ⏰ EventReminder
> Event के लिए scheduled reminders

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `event_id` | string | ✅ | — | FK → Event |
| `reminder_type` | enum | ❌ | `24_hours` | 24_hours, 48_hours, custom |
| `custom_hours` | number | ❌ | `0` | Custom hours before |
| `scheduled_for` | datetime | ❌ | — | When to send |
| `status` | enum | ❌ | `pending` | pending, sent, cancelled |

**RLS:** `created_by_id === user.id`

---

### 14. 📝 Quotation
> Client को भेजी जाने वाली quotation — multi-category, GST, online signing

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `quotation_number` | string | ✅ | — | Unique number |
| `client_id` | string | ❌ | — | FK → Client |
| `event_id` | string | ❌ | — | FK → Event |
| `quotation_date` | date | ✅ | — | Quote date |
| `valid_until` | date | ❌ | — | Validity |
| `status` | enum | ❌ | `draft` | draft, finalized, accepted, rejected, expired, cancelled |
| `category` | enum | ❌ | `PHOTOGRAPHY` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, OTHER |
| `context_type` | string | ❌ | — | bride_side, groom_side, residential, etc. |
| `start_date` | date | ❌ | — | Project start |
| `end_date` | date | ❌ | — | Project end |
| `excluded_dates` | array[date] | ❌ | `[]` | Not in scope |
| `show_pricing` | boolean | ❌ | `true` | Show qty/rate to client? |
| `template_id` | string | ❌ | `black_premium` | PDF template |
| `template_config` | string (JSON) | ❌ | — | Template customization |
| `project_title` | string | ❌ | — | Scope title |
| `project_summary` | string | ❌ | — | Summary |
| `subtotal` | number | ❌ | `0` | Before discount |
| `discount_type` | enum | ❌ | `percent` | percent, fixed |
| `discount_value` | number | ❌ | `0` | Discount value |
| `discount_amount` | number | ❌ | `0` | Calculated discount |
| `taxable_amount` | number | ❌ | `0` | After discount |
| `gst_applicable` | boolean | ❌ | `false` | GST on? |
| `gst_mode` | enum | ❌ | `cgst_sgst` | cgst_sgst, igst |
| `cgst_amount` | number | ❌ | `0` | CGST |
| `sgst_amount` | number | ❌ | `0` | SGST |
| `igst_amount` | number | ❌ | `0` | IGST |
| `gst_total` | number | ❌ | `0` | Total GST |
| `grand_total` | number | ❌ | `0` | Final amount |
| `payment_schedule_json` | string (JSON) | ❌ | — | Milestones |
| `terms_and_conditions` | string | ❌ | — | T&C |
| `special_notes` | string | ❌ | — | Scope-specific notes |
| `payment_conditions` | string | ❌ | — | Shown on PDF |
| `notes` | string | ❌ | — | Internal |
| `bank_details_snapshot` | string (JSON) | ❌ | — | Bank/UPI frozen |
| `social_links_snapshot` | string (JSON) | ❌ | — | Social frozen |
| `footer_message` | string | ❌ | — | Thank you message |
| `client_snapshot` | string (JSON) | ❌ | — | Client data frozen |
| `business_snapshot` | string (JSON) | ❌ | — | Business data frozen |
| `event_snapshot` | string (JSON) | ❌ | — | Event data frozen |
| `client_signature` | string | ❌ | — | Signature data URL |
| `signed_by_name` | string | ❌ | — | Who signed |
| `signed_at` | datetime | ❌ | — | When signed |
| `client_access_password` | string | ❌ | — | Optional gate |
| `public_token` | string | ❌ | — | Portal URL token |
| `public_link_enabled` | boolean | ❌ | `false` | Portal on/off |
| `hide_team_names` | boolean | ❌ | `false` | Hide team on portal |
| `portal_first_viewed_at` | datetime | ❌ | — | First view |
| `portal_latest_viewed_at` | datetime | ❌ | — | Latest view |
| `portal_view_count` | number | ❌ | `0` | View count |
| `sync_pending` | boolean | ❌ | `false` | Needs Event+Financial sync |
| `sync_completed_at` | datetime | ❌ | — | Sync done at |

**RLS:** `created_by_id === user.id`

---

### 15. 📋 QuotationItem
> Quotation के line items — service, role, team, custom

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `quotation_id` | string | ✅ | — | FK → Quotation |
| `item_type` | enum | ❌ | `custom` | service, role, team, custom |
| `reference_id` | string | ❌ | — | service_id/ role_id/ team_member_id |
| `team_member_id` | string | ❌ | — | For team items |
| `team_member_name_snapshot` | string | ❌ | — | Name frozen |
| `member_type` | string | ❌ | — | bride_side, groom_side, etc. |
| `day_date` | date | ❌ | — | Which day/ phase |
| `phase_title` | string | ❌ | — | Haldi, Sangeet, etc. |
| `is_addon` | boolean | ❌ | `false` | Add-on? |
| `name` | string | ✅ | — | Item name |
| `description` | string | ❌ | — | Description |
| `quantity` | number | ❌ | `1` | Quantity |
| `days` | number | ❌ | `1` | Number of days |
| `unit_rate` | number | ❌ | `0` | Per-unit rate |
| `rate_type` | enum | ❌ | `Fixed` | Fixed, Per Day, Per Unit, Per Event |
| `line_total` | number | ❌ | `0` | Calculated total |
| `gst_rate` | number | ❌ | `0` | GST % |
| `sac_code` | string | ❌ | — | SAC code |
| `sort_order` | number | ❌ | `0` | Display order |

**RLS:** `created_by_id === user.id`

---

### 16. 📦 QuotationPackage
> Reusable templates — एक click में quotation में add होते हैं

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Package name |
| `description` | string | ❌ | — | Description |
| `category` | enum | ❌ | `PHOTOGRAPHY` | PHOTOGRAPHY, EVENT_MANAGEMENT, ARCHITECTURE, OTHER |
| `structure_json` | string (JSON) | ❌ | — | Days with team, services, items |
| `terms_and_conditions` | string | ❌ | — | Default T&C |
| `footer_message` | string | ❌ | — | Default footer |
| `status` | enum | ❌ | `active` | active, inactive |

**RLS:** `created_by_id === user.id`

---

### 17. 📄 Invoice
> Client को भेजी जाने वाली tax invoice

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `invoice_number` | string | ✅ | — | Unique number |
| `quotation_id` | string | ❌ | — | FK → Quotation (source) |
| `client_id` | string | ❌ | — | FK → Client |
| `event_id` | string | ❌ | — | FK → Event |
| `invoice_date` | date | ✅ | — | Invoice date |
| `due_date` | date | ❌ | — | Due date |
| `due_date_type` | enum | ❌ | `due_on_receipt` | due_on_receipt, net_15, net_30, custom |
| `invoice_type` | enum | ❌ | `manual` | full, milestone, manual |
| `milestone_id` | string | ❌ | — | FK → PaymentMilestone |
| `milestone_tag` | enum | ❌ | `Full Payment` | Advance, Event Day, Final Handover, Full Payment, Custom |
| `status` | enum | ❌ | `draft` | draft, due, sent, paid, partial, overdue, cancelled |
| `show_itemized_rates` | boolean | ❌ | `true` | Show rates on PDF? |
| `subtotal` | number | ❌ | `0` | Before discount |
| `discount_type` | enum | ❌ | `percent` | percent, fixed |
| `discount_value` | number | ❌ | `0` | Discount value |
| `discount_amount` | number | ❌ | `0` | Calculated |
| `taxable_amount` | number | ❌ | `0` | After discount |
| `gst_applicable` | boolean | ❌ | `false` | GST on? |
| `gst_rate` | number | ❌ | `0` | GST % |
| `gst_mode` | enum | ❌ | `cgst_sgst` | cgst_sgst, igst |
| `cgst_amount` | number | ❌ | `0` | CGST |
| `sgst_amount` | number | ❌ | `0` | SGST |
| `igst_amount` | number | ❌ | `0` | IGST |
| `gst_total` | number | ❌ | `0` | Total GST |
| `grand_total` | number | ❌ | `0` | Final amount |
| `amount_paid` | number | ❌ | `0` | Paid so far |
| `balance_due` | number | ❌ | `0` | Remaining |
| `amount_in_words` | string | ❌ | — | "Rupees one lakh only" |
| `payment_schedule_json` | string (JSON) | ❌ | — | Schedule |
| `client_snapshot` | string (JSON) | ❌ | — | Client frozen |
| `business_snapshot` | string (JSON) | ❌ | — | Business frozen |
| `event_snapshot` | string (JSON) | ❌ | — | Event frozen |
| `bank_details_snapshot` | string (JSON) | ❌ | — | Bank frozen |
| `social_links_snapshot` | string (JSON) | ❌ | — | Social frozen |
| `authorized_signatory` | string | ❌ | — | Signatory name |
| `signature_type` | enum | ❌ | `none` | none, text, esign |
| `signature_image` | string | ❌ | — | Signature data URL |
| `signature_color` | string | ❌ | `#000000` | Ink color |
| `notes` | string | ❌ | — | Internal |
| `payment_terms` | string | ❌ | — | Client-visible |
| `terms_and_conditions` | string | ❌ | — | Client-visible |
| `public_token` | string | ❌ | — | Public URL token |
| `public_link_enabled` | boolean | ❌ | `false` | Link on/off |
| `portal_view_count` | number | ❌ | `0` | Views |
| `portal_first_viewed_at` | datetime | ❌ | — | First view |
| `portal_latest_viewed_at` | datetime | ❌ | — | Latest view |

**RLS:** `created_by_id === user.id`

---

### 18. 📋 InvoiceItem
> Invoice के line items

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `invoice_id` | string | ✅ | — | FK → Invoice |
| `item_type` | enum | ❌ | `line_item` | package, line_item |
| `name` | string | ✅ | — | Name/ description |
| `description` | string | ❌ | — | Description |
| `deliverables` | string | ❌ | — | Newline-separated |
| `quantity` | number | ❌ | `1` | Quantity |
| `unit_rate` | number | ❌ | `0` | Rate |
| `line_total` | number | ❌ | `0` | Total |
| `events_json` | string (JSON) | ❌ | — | For package type |
| `sort_order` | number | ❌ | `0` | Order |

**RLS:** `created_by_id === user.id`

---

### 19. 💰 PaymentMilestone
> Quotation/ Event के payment milestones

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `quotation_id` | string | ❌ | — | FK → Quotation |
| `event_id` | string | ❌ | — | FK → Event |
| `client_id` | string | ❌ | — | FK → Client |
| `name` | string | ✅ | — | Milestone name |
| `description` | string | ❌ | — | Description |
| `sort_order` | number | ❌ | `0` | Order |
| `milestone_type` | enum | ❌ | `percent` | percent, fixed |
| `milestone_value` | number | ❌ | `0` | % or amount |
| `due_amount` | number | ❌ | `0` | Calculated |
| `paid_amount` | number | ❌ | `0` | From receipts |
| `due_condition` | string | ❌ | — | On signing, On event day |
| `due_date` | date | ❌ | — | Due date |
| `status` | enum | ❌ | `upcoming` | upcoming, due, partially_paid, paid, overdue |
| `financial_year_id` | string | ❌ | — | FK → FinancialYear |

**RLS:** `created_by_id === user.id`

---

### 20. 💵 FinancialTransaction
> सारा money flow — receipts, payments, expenses

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `financial_year_id` | string | ❌ | — | FK → FinancialYear |
| `event_id` | string | ❌ | — | FK → Event |
| `transaction_type` | enum | ✅ | — | CLIENT_RECEIPT, TEAM_PAYMENT, BUSINESS_EXPENSE |
| `client_id` | string | ❌ | — | FK → Client (receipts) |
| `team_member_id` | string | ❌ | — | FK → TeamMember (payments) |
| `team_assignment_id` | string | ❌ | — | FK → EventTeamAssignment |
| `service_assignment_id` | string | ❌ | — | FK → EventServiceAssignment |
| `milestone_id` | string | ❌ | — | FK → PaymentMilestone |
| `invoice_id` | string | ❌ | — | FK → Invoice |
| `expense_category_id` | string | ❌ | — | FK → ExpenseCategory |
| `expense_category_name_snapshot` | string | ❌ | — | Category frozen |
| `amount` | number | ✅ | `0` | Amount |
| `payment_method` | enum | ❌ | `Cash` | Cash, UPI, Bank Transfer, Card, Cheque, Other |
| `transaction_date` | date | ✅ | — | Date |
| `reference_number` | string | ❌ | — | UTR/ cheque no. |
| `notes` | string | ❌ | — | Notes |
| `status` | enum | ❌ | `ACTIVE` | ACTIVE, VOID |

**RLS:** `created_by_id === user.id`

---

### 21. 📅 FinancialYear
> Workspace-level financial years

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `fy_id` | string | ✅ | — | FY2026-27 format |
| `label` | string | ✅ | — | "April 2026 - March 2027" |
| `start_date` | date | ✅ | — | FY start |
| `end_date` | date | ✅ | — | FY end |
| `is_active` | boolean | ❌ | `false` | Default FY? |
| `status` | enum | ❌ | `open` | open, closed |

**RLS:** `created_by_id === user.id`

---

### 22. 🏷️ ExpenseCategory
> Expense categories — travel, equipment, etc.

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Category name |
| `status` | enum | ❌ | `active` | active, inactive |

**RLS:** `created_by_id === user.id`

---

### 23. 🛎️ Service
> Service catalog — आपकी services with default rates

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Service name |
| `description` | string | ❌ | — | Description |
| `default_rate` | number | ❌ | `0` | Default rate |
| `rate_type` | enum | ❌ | `Fixed` | Fixed, Per Day, Per Unit |
| `gst_rate` | number | ❌ | `0` | GST % |
| `sac_code` | string | ❌ | — | SAC code |
| `status` | enum | ❌ | `active` | active, inactive |

**RLS:** `created_by_id === user.id`

---

### 24. 🤝 ServiceProvider
> External service providers (vendors)

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `name` | string | ✅ | — | Provider name |
| `phone` | string | ❌ | — | Phone |
| `email` | string (email) | ❌ | — | Email |
| `notes` | string | ❌ | — | Notes |
| `status` | enum | ❌ | `active` | active, inactive |

**RLS:** `created_by_id === user.id`

---

### 25. 📋 JobSheet
> Event का execution plan — crew को दिखाने के लिए

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `event_id` | string | ✅ | — | FK → Event |
| `quotation_id` | string | ❌ | — | FK → Quotation |
| `show_team_names` | boolean | ❌ | `false` | Names vs roles |
| `include_crew_contacts` | boolean | ❌ | `false` | Contact directory |
| `include_equipment` | boolean | ❌ | `false` | Equipment checklist |
| `show_job_sheet` | boolean | ❌ | `false` | Show in team portal |
| `equipment_list` | string (JSON) | ❌ | — | Array of strings |
| `deliverables` | string (JSON) | ❌ | — | Array of strings |
| `date_configs` | string (JSON) | ❌ | — | Per-date config |
| `internal_notes` | string | ❌ | — | Execution notes |
| `status` | enum | ❌ | `active` | active, archived |
| `public_token` | string | ❌ | — | Crew URL token |
| `public_link_enabled` | boolean | ❌ | `false` | Link on/off |
| `portal_view_count` | number | ❌ | `0` | Views |
| `portal_first_viewed_at` | datetime | ❌ | — | First view |
| `portal_latest_viewed_at` | datetime | ❌ | — | Latest view |

**RLS:** `created_by_id === user.id`

---

### 26. 🔗 QuotationPortal / JobSheetPortal
> Public portal access records (separate entities for quotation और job sheet)

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `quotation_id` / `event_id` | string | ✅ | — | FK → Quotation/ Event |
| `public_token` | string | ✅ | — | Secure random token |
| `is_enabled` | boolean | ❌ | `true` | Master switch |
| `view_count` | number | ❌ | `0` | Total views |
| `first_viewed_at` | datetime | ❌ | — | First view |
| `last_viewed_at` | datetime | ❌ | — | Latest view |

**RLS:** Owner + Admin

---

### 27. 🔐 UserAuthCredential
> WebAuthn app lock credentials

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `user_id` | string | ✅ | — | FK → User |
| `credential_id` | string | ✅ | — | base64url |
| `public_key` | string | ✅ | — | JWK string |
| `counter` | number | ❌ | `0` | Signature counter |
| `device_label` | string | ❌ | — | Device name |
| `transports` | string (JSON) | ❌ | — | internal, hybrid, usb, etc. |

**RLS:** `user_id === user.id`

---

### 28. 📲 PushSubscription
> Push notification device tokens

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `user_id` | string | ✅ | — | FK → User |
| `platform` | enum | ✅ | — | web, android, ios |
| `endpoint` | string | ❌ | — | Web push endpoint |
| `push_token` | string | ❌ | — | FCM/ APNs token |
| `p256dh_key` | string | ❌ | — | ECDH public key |
| `auth_key` | string | ❌ | — | Auth secret |

**RLS:** `user_id === user.id`

---

### 29. 🔔 Notification
> In-app notifications

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `user_id` | string | ✅ | — | FK → User |
| `type` | enum | ✅ | — | event_reminder, payment_due, subscription_expiring, subscription_expired, team_conflict, general |
| `title` | string | ✅ | — | Title |
| `message` | string | ❌ | — | Body |
| `related_entity_type` | string | ❌ | — | Event, Invoice, etc. |
| `related_entity_id` | string | ❌ | — | FK reference |
| `read` | boolean | ❌ | `false` | Read? |

**RLS:** `user_id === user.id` (read/ update/ delete), Admin create

---

### 30. 🎫 SupportTicket
> User support tickets

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `user_id` | string | ✅ | — | FK → User |
| `user_name` | string | ❌ | — | Snapshot |
| `user_email` | string | ❌ | — | Snapshot |
| `subject` | string | ✅ | — | Subject |
| `message` | string | ✅ | — | Message |
| `category` | enum | ❌ | `general` | bug, feature_request, billing, account, general |
| `priority` | enum | ❌ | `medium` | low, medium, high, urgent |
| `status` | enum | ❌ | `open` | open, in_progress, resolved, closed |
| `admin_response` | string | ❌ | — | Admin reply |
| `resolved_at` | datetime | ❌ | — | Resolved time |

**RLS:** `user_id === user.id` (read/ create), Admin (update/ delete)

---

### 31-33. 💳 SaaS Billing — Plan, PlanPricing, PlanLimit
> Platform-level plans और pricing (Admin managed)

**Plan:**
| Field | Type | Required | क्या है |
|-------|------|----------|---------|
| `code` | string | ✅ | Plan code (FREE, PRO) |
| `name` | string | ✅ | Display name |
| `description` | string | ❌ | Description |
| `is_active` | boolean | ❌ | Active? |
| `sort_order` | number | ❌ | Display order |

**PlanPricing:**
| Field | Type | Required | क्या है |
|-------|------|----------|---------|
| `plan_id` | string | ✅ | FK → Plan |
| `billing_cycle` | enum | ✅ | MONTHLY, SIX_MONTHS, ANNUAL |
| `price` | number | ✅ | Price |
| `currency` | string | ❌ | INR |
| `duration_months` | number | ✅ | Duration |
| `storage_gb` | number | ❌ | Storage |
| `is_active` | boolean | ❌ | Active? |
| `sort_order` | number | ❌ | Order |

**PlanLimit:**
| Field | Type | Required | क्या है |
|-------|------|----------|---------|
| `plan_id` | string | ✅ | FK → Plan |
| `limit_key` | enum | ✅ | max_events, max_team_members, max_services, max_storage_gb, pdf_export_enabled, reminders_enabled |
| `limit_value` | string | ✅ | Number or true/false |
| `enabled` | boolean | ❌ | Enabled? |

**RLS:** Public read, Admin write

---

### 34-36. 📊 SaaS Subscriptions
> Workspace की subscription tracking

**WorkspaceSubscription:**
| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `plan_id` | string | ✅ | — | FK → Plan |
| `pricing_id` | string | ❌ | — | FK → PlanPricing |
| `status` | enum | ✅ | `ACTIVE` | ACTIVE, EXPIRED, CANCELLED, SUSPENDED |
| `started_at` | date | ❌ | — | Start |
| `expires_at` | date | ❌ | — | Expiry |
| `auto_renew` | boolean | ❌ | `false` | Auto renew? |
| `source` | enum | ❌ | `ADMIN` | ADMIN, PAYMENT_GATEWAY, PROMOTIONAL, ONBOARDING |
| `assigned_price` | number | ❌ | `0` | Price snapshot |
| `billing_cycle_snapshot` | string | ❌ | — | Cycle frozen |
| `updated_by` | string | ❌ | — | FK → User |
| `note` | string | ❌ | — | Reason |

**SubscriptionPayment:**
| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `subscription_id` | string | ❌ | — | FK → WorkspaceSubscription |
| `plan_id` | string | ❌ | — | FK → Plan |
| `pricing_id` | string | ❌ | — | FK → PlanPricing |
| `amount` | number | ✅ | `0` | Amount |
| `currency` | string | ❌ | `INR` | Currency |
| `gateway` | string | ❌ | `stripe` | Payment gateway |
| `gateway_order_id` | string | ❌ | — | Order/ session ID |
| `gateway_payment_id` | string | ❌ | — | Payment ID |
| `billing_cycle_snapshot` | string | ❌ | — | Cycle frozen |
| `status` | enum | ✅ | `CREATED` | CREATED, SUCCESS, FAILED, REFUNDED |
| `verified_at` | datetime | ❌ | — | Verified time |
| `failure_reason` | string | ❌ | — | Failure reason |

**UpgradeRequest:**
| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `requested_plan` | string | ❌ | `PRO` | Plan code |
| `requested_pricing_id` | string | ❌ | — | FK → PlanPricing |
| `status` | enum | ✅ | `PENDING` | PENDING, APPROVED, REJECTED |
| `requested_at` | datetime | ❌ | — | Request time |
| `reviewed_at` | datetime | ❌ | — | Review time |
| `reviewed_by` | string | ❌ | — | FK → User |
| `note` | string | ❌ | — | Note |

**RLS:** Owner + Admin

---

### 37. 💾 StorageUsage
> Workspace storage tracking (Admin only)

| Field | Type | Required | Default | क्या है |
|-------|------|----------|---------|--------|
| `workspace_id` | string | ✅ | — | FK → Workspace |
| `total_bytes` | number | ❌ | `0` | Bytes used |
| `file_count` | number | ❌ | `0` | File count |

**RLS:** Admin only

---

## 🔗 Entity Relationships (कैसे सब जुड़े हैं)

```
User (1) ──→ (N) Workspace [owner_user_id]
User (1) ──→ (N) WorkspaceMember [user_id]
User (1) ──→ (N) UserAuthCredential [user_id]
User (1) ──→ (N) PushSubscription [user_id]
User (1) ──→ (N) Notification [user_id]
User (1) ──→ (N) SupportTicket [user_id]

Workspace (1) ──→ (N) Client [workspace_id]
Workspace (1) ──→ (N) Lead [workspace_id]
Workspace (1) ──→ (N) Event [workspace_id]
Workspace (1) ──→ (N) TeamMember [workspace_id]
Workspace (1) ──→ (N) TeamRole [workspace_id]
Workspace (1) ──→ (N) Service [workspace_id]
Workspace (1) ──→ (N) ServiceProvider [workspace_id]
Workspace (1) ──→ (N) Quotation [workspace_id]
Workspace (1) ──→ (N) Invoice [workspace_id]
Workspace (1) ──→ (N) FinancialYear [workspace_id]
Workspace (1) ──→ (N) ExpenseCategory [workspace_id]
Workspace (1) ──→ (N) FinancialTransaction [workspace_id]
Workspace (1) ──→ (N) QuotationPackage [workspace_id]
Workspace (1) ──→ (N) WorkspaceSubscription [workspace_id]
Workspace (1) ──→ (N) StorageUsage [workspace_id]

Client (1) ──→ (N) Event [client_id]
Client (1) ──→ (N) Quotation [client_id]
Client (1) ──→ (N) Invoice [client_id]
Client (1) ──→ (N) Lead [converted_client_id]
Client (1) ──→ (N) PaymentMilestone [client_id]
Client (1) ──→ (N) FinancialTransaction [client_id]

Event (1) ──→ (N) EventTeamAssignment [event_id]
Event (1) ──→ (N) EventServiceAssignment [event_id]
Event (1) ──→ (N) EventDayAssignment [event_id]
Event (1) ──→ (N) EventReminder [event_id]
Event (1) ──→ (N) JobSheet [event_id]
Event (1) ──→ (N) Quotation [event_id]
Event (1) ──→ (N) Invoice [event_id]
Event (1) ──→ (N) PaymentMilestone [event_id]
Event (1) ──→ (N) FinancialTransaction [event_id]

TeamMember (1) ──→ (N) EventTeamAssignment [team_member_id]
TeamMember (1) ──→ (N) TeamBlockDate [team_member_id]
TeamMember (1) ──→ (N) FinancialTransaction [team_member_id]

TeamRole (1) ──→ (N) TeamMember [role_id]
TeamRole (1) ──→ (N) EventTeamAssignment [role_id]

Service (1) ──→ (N) EventServiceAssignment [service_id]
Service (1) ──→ (N) QuotationItem [reference_id]

Quotation (1) ──→ (N) QuotationItem [quotation_id]
Quotation (1) ──→ (N) PaymentMilestone [quotation_id]
Quotation (1) ──→ (N) Invoice [quotation_id]
Quotation (1) ──→ (1) QuotationPortal [quotation_id]

Invoice (1) ──→ (N) InvoiceItem [invoice_id]
Invoice (1) ──→ (N) FinancialTransaction [invoice_id]

FinancialYear (1) ──→ (N) FinancialTransaction [financial_year_id]
FinancialYear (1) ──→ (N) PaymentMilestone [financial_year_id]

ExpenseCategory (1) ──→ (N) FinancialTransaction [expense_category_id]

Plan (1) ──→ (N) PlanPricing [plan_id]
Plan (1) ──→ (N) PlanLimit [plan_id]
Plan (1) ──→ (N) WorkspaceSubscription [plan_id]
Plan (1) ──→ (N) SubscriptionPayment [plan_id]
Plan (1) ──→ (N) UpgradeRequest [requested_plan]

PlanPricing (1) ──→ (N) WorkspaceSubscription [pricing_id]
PlanPricing (1) ──→ (N) SubscriptionPayment [pricing_id]
PlanPricing (1) ──→ (N) UpgradeRequest [requested_pricing_id]

WorkspaceSubscription (1) ──→ (N) SubscriptionPayment [subscription_id]
```

---

## 🔄 Complete Flow: Event कैसे बनता है (Step by Step)

### Step 1: User Register
```
User registers → User entity में record बनता है
  - id: auto
  - email: user input
  - full_name: user input
  - role: "user" (default)
  - created_date: now
```

### Step 2: Onboarding → Workspace बनता है
```
Workspace entity में record बनता है:
  - id: auto
  - name: "John Photography"
  - business_category: "PHOTOGRAPHY"
  - owner_user_id: User.id
  - currency: "INR"
  - timezone: "Asia/Kolkata"
  - plan_type: "free"
  - plan_status: "active"
  - fy_start_month: 4
  - created_by_id: User.id
```

### Step 3: Client बनाते हैं
```
Client entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - name: "Rahul Sharma"
  - phone: "+919876543210"
  - email: "rahul@gmail.com"
  - created_by_id: User.id
```

### Step 4: Event बनाते हैं
```
Event entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - client_id: Client.id
  - title: "Rahul's Wedding"
  - event_type: "Wedding"
  - start_date: "2026-12-10"
  - end_date: "2026-12-12"
  - event_dates: ["2026-12-10", "2026-12-11", "2026-12-12"]
  - status: "upcoming"
  - contract_value: 150000
  - venue: "Taj Hotel, Mumbai"
  - financial_year: "FY2026-27"
  - created_by_id: User.id
```

### Step 5: Team Assign करते हैं
```
EventTeamAssignment entity में records (हर member के लिए एक):
  - id: auto
  - workspace_id: Workspace.id
  - event_id: Event.id
  - team_member_id: TeamMember.id
  - role_id: TeamRole.id
  - role_name_snapshot: "Photographer"
  - agreed_rate: 25000
  - rate_type: "Per Event"
  - working_dates: ["2026-12-10", "2026-12-11", "2026-12-12"]
  - booking_start_date: "2026-12-10"
  - booking_end_date: "2026-12-12"
  - assignment_status: "assigned"
  - created_by_id: User.id
```

### Step 6: Service Assign करते हैं
```
EventServiceAssignment entity में records:
  - id: auto
  - workspace_id: Workspace.id
  - event_id: Event.id
  - service_id: Service.id
  - service_name_snapshot: "Candid Photography"
  - agreed_rate: 50000
  - rate_type: "Fixed"
  - assignment_status: "assigned"
  - created_by_id: User.id
```

### Step 7: Quotation बनाते हैं
```
Quotation entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - quotation_number: "Q-2026-001"
  - client_id: Client.id
  - event_id: Event.id
  - quotation_date: "2026-09-21"
  - status: "draft"
  - category: "PHOTOGRAPHY"
  - subtotal: 150000
  - grand_total: 177000 (with GST)
  - gst_applicable: true
  - gst_mode: "cgst_sgst"
  - cgst_amount: 13500
  - sgst_amount: 13500
  - client_snapshot: {name, phone, email, address} (frozen)
  - business_snapshot: {name, logo, address} (frozen)
  - created_by_id: User.id

QuotationItem entity में records (हर line item के लिए):
  - id: auto
  - workspace_id: Workspace.id
  - quotation_id: Quotation.id
  - item_type: "service"
  - reference_id: Service.id
  - name: "Candid Photography"
  - quantity: 1
  - days: 3
  - unit_rate: 50000
  - line_total: 50000
  - sort_order: 1
  - created_by_id: User.id
```

### Step 8: Quotation Finalize + Client Sign
```
Quotation update:
  - status: "finalized" → "accepted"
  - public_token: "abc123xyz" (random)
  - public_link_enabled: true
  - client_signature: "data:image/png;base64,..."
  - signed_by_name: "Rahul Sharma"
  - signed_at: "2026-09-22T10:30:00Z"

QuotationPortal entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - quotation_id: Quotation.id
  - public_token: "abc123xyz"
  - is_enabled: true
  - view_count: 1
  - first_viewed_at: "2026-09-22T10:00:00Z"
```

### Step 9: Invoice बनाते हैं
```
Invoice entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - invoice_number: "INV-2026-001"
  - quotation_id: Quotation.id
  - client_id: Client.id
  - event_id: Event.id
  - invoice_date: "2026-09-22"
  - invoice_type: "full"
  - status: "due"
  - subtotal: 150000
  - grand_total: 177000
  - amount_paid: 0
  - balance_due: 177000
  - client_snapshot: {frozen}
  - business_snapshot: {frozen}
  - public_token: "inv123abc"
  - public_link_enabled: true
  - created_by_id: User.id

InvoiceItem entity में records:
  - id: auto
  - workspace_id: Workspace.id
  - invoice_id: Invoice.id
  - name: "Candid Photography"
  - quantity: 1
  - unit_rate: 50000
  - line_total: 50000
  - sort_order: 1
  - created_by_id: User.id
```

### Step 10: Payment Record करते हैं
```
FinancialTransaction entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - financial_year_id: FinancialYear.id
  - event_id: Event.id
  - transaction_type: "CLIENT_RECEIPT"
  - client_id: Client.id
  - invoice_id: Invoice.id
  - amount: 50000
  - payment_method: "UPI"
  - transaction_date: "2026-09-23"
  - reference_number: "UPI123456789"
  - status: "ACTIVE"
  - created_by_id: User.id

Invoice update:
  - amount_paid: 50000
  - balance_due: 127000
  - status: "partial"
```

### Step 11: Team Payment Record करते हैं
```
FinancialTransaction entity में record:
  - id: auto
  - workspace_id: Workspace.id
  - financial_year_id: FinancialYear.id
  - event_id: Event.id
  - transaction_type: "TEAM_PAYMENT"
  - team_member_id: TeamMember.id
  - team_assignment_id: EventTeamAssignment.id
  - amount: 25000
  - payment_method: "Bank Transfer"
  - transaction_date: "2026-09-24"
  - status: "ACTIVE"
  - created_by_id: User.id
```

---

## 📊 Data Flow Summary

```
User Register → Workspace (Onboarding)
                    ↓
              Client + Lead (CRM)
                    ↓
              Event (Project/ Work)
                    ↓
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
TeamMember    Service      Quotation
Assignment   Assignment      + Items
                    ↓
              Invoice + Items
                    ↓
         FinancialTransaction
         (Receipts/ Payments/ Expenses)
                    ↓
         PaymentMilestone (tracking)
```

---

## 🔐 Security & Isolation

### हर record में ये fields automatic add होते हैं:
- `created_by_id` — किसने बनाया
- `created_date` — कब बना
- `updated_date` — कब update हुआ

### RLS ensure करता है:
- User A का data User B को कभी नहीं दिखता
- Admin सब देख सकता है (platform-level)
- Client portal users सिर्फ अपना data देखते हैं
- Team member portal users सिर्फ अपना data देखते हैं

### Snapshots (frozen data):
Quotation और Invoice में client/ business/ event data JSON snapshot के रूप में store होता है। अगर original record बदले तब भी quotation/ invoice पुराना data दिखाती हैं — historical accuracy के लिए।

---

> **यह document complete है। हर entity, हर field, हर relationship documented है। Supabase migration के समय यही सब tables और columns PostgreSQL में बनेंगे।**