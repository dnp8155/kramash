# Kramashah — Complete Database Schema (Supabase Migration Reference)

> **Purpose:** This document lists every table (entity), its columns, data types, relationships, and Row-Level Security rules so you can recreate the full database locally on Supabase.
>
> **Built-in columns on EVERY table (do not re-declare in Supabase schema, use these equivalents):**
> | Base44 Field | Supabase Equivalent | Type |
> |---|---|---|
> | `id` | `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
> | `created_date` | `created_at` | `TIMESTAMPTZ DEFAULT now()` |
> | `updated_date` | `updated_at` | `TIMESTAMPTZ DEFAULT now()` |
> | `created_by_id` | `created_by` | `UUID REFERENCES auth.users(id)` |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core / Workspace Tables](#2-core--workspace-tables)
3. [CRM Tables](#3-crm-tables)
4. [Event / Project Tables](#4-event--project-tables)
5. [Quotation Tables](#5-quotation-tables)
6. [Invoice Tables](#6-invoice-tables)
7. [Financial Tables](#7-financial-tables)
8. [Job Sheet Tables](#8-job-sheet-tables)
9. [Public Portal Tables](#9-public-portal-tables)
10. [SaaS / Subscription Tables](#10-saas--subscription-tables)
11. [System Tables](#11-system-tables)
12. [Entity Relationship Diagram (Text)](#12-entity-relationship-diagram-text)
13. [Supabase RLS Translation Guide](#13-supabase-rls-translation-guide)
14. [Migration Notes](#14-migration-notes)

---

## 1. Architecture Overview

```
auth.users (Supabase built-in)
  └── User (app-level profile, 1:1 with auth.users)
        ├── role: admin | user | client
        ├── linked_client_id → Client.id (for client-role users)
        └── linked_workspace_id → Workspace.id (for client-role users)

Workspace (top-level tenant / business)
  ├── owner_user_id → User.id
  ├── WorkspaceMember[] (multi-user access)
  ├── Client[]
  ├── TeamMember[]
  ├── TeamRole[]
  ├── Service[]
  ├── ServiceProvider[]
  ├── Event[]
  ├── Quotation[]
  ├── Invoice[]
  ├── FinancialYear[]
  ├── FinancialTransaction[]
  ├── ExpenseCategory[]
  ├── QuotationPackage[]
  ├── Notification[]
  ├── SupportTicket[]
  ├── StorageUsage[]
  ├── WorkspaceSubscription[]
  ├── UpgradeRequest[]
  └── SubscriptionPayment[]
```

**Multi-tenancy pattern:** Every business table has a `workspace_id` column (UUID) that scopes all records to a specific Workspace. This is the primary isolation boundary.

---

## 2. Core / Workspace Tables

### 2.1 `User` (Built-in — maps to Supabase `auth.users` + profile table)

> **Supabase strategy:** Use `auth.users` for authentication. Create a `profiles` table with 1:1 relationship triggered on user signup.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Same as `auth.users.id` |
| `full_name` | TEXT | Built-in (from auth) |
| `email` | TEXT | Built-in (from auth) |
| `role` | TEXT | `admin` \| `user` \| `client` \| `team_member` (default `user`) |
| `phone` | TEXT | E.164 format for OTP login |
| `language` | TEXT | `en` \| `hi` \| `gu` (default `en`) |
| `linked_client_id` | UUID FK → `Client.id` | For client-role users |
| `linked_team_member_id` | UUID FK → `TeamMember.id` | For team_member-role users |
| `linked_workspace_id` | UUID FK → `Workspace.id` | For client/team_member-role users |
| `app_lock_enabled` | BOOLEAN | `false` | Whether WebAuthn app lock is enabled |
| `app_lock_relock_after` | INTEGER | `0` | Re-lock after N minutes (0 = re-lock on tab close only) |

**RLS:** Admins can list/update/delete other users. Regular users manage only their own profile.

---

### 2.2 `Workspace`

The top-level business/tenant entity. Every other business record references this.

| Column | Type | Default | Notes |
|---|---|---|---|
| `name` | TEXT | — | **Required.** Business name |
| `business_type` | TEXT | — | Free-text business type |
| `business_category` | TEXT | `OTHER` | `PHOTOGRAPHY` \| `EVENT_MANAGEMENT` \| `ARCHITECTURE` \| `INTERIOR` \| `SALON_BEAUTY` \| `CONSULTING` \| `AGENCY` \| `CATERING` \| `CONTRACTING` \| `OTHER` |
| `custom_business_type` | TEXT | — | For OTHER category |
| `custom_work_label_singular` | TEXT | — | Custom terminology (e.g. "Shoot" vs "Event") |
| `custom_work_label_plural` | TEXT | — | Custom terminology (e.g. "Shoots" vs "Events") |
| `owner_user_id` | UUID FK → `auth.users.id` | — | **Required.** Workspace owner |
| `email` | TEXT | — | Business email |
| `phone` | TEXT | — | Business phone |
| `logo` | TEXT | — | Logo URL (public storage) |
| `address` | TEXT | — | Business address |
| `city` | TEXT | — | |
| `state` | TEXT | — | |
| `country` | TEXT | — | |
| `currency` | TEXT | `INR` | ISO currency code |
| `timezone` | TEXT | `Asia/Kolkata` | IANA timezone |
| `plan_type` | TEXT | `free` | `free` \| `pro` |
| `plan_status` | TEXT | `active` | `active` \| `suspended` \| `cancelled` |
| `gst_enabled` | BOOLEAN | `false` | GST registration toggle |
| `gstin` | TEXT | — | GST identification number |
| `gst_business_name` | TEXT | — | Registered business name |
| `gst_billing_address` | TEXT | — | |
| `gst_state` | TEXT | — | |
| `default_gst_rate` | NUMERIC | `18` | Default GST % |
| `team_member_types` | TEXT (JSON) | — | JSON array of type objects |
| `event_types` | TEXT (JSON) | — | JSON array of event type strings |
| `display_preferences` | TEXT (JSON) | — | JSON of UI toggle preferences |
| `tagline` | TEXT | — | Business tagline |
| `website` | TEXT | — | Website URL |
| `date_format` | TEXT | `DD/MM/YYYY` | `DD/MM/YYYY` \| `MM/DD/YYYY` \| `YYYY-MM-DD` |
| `number_format` | TEXT | `indian` | `indian` \| `western` |
| `fy_start_month` | INTEGER | `4` | Financial year start month (1-12) |
| `public_profile_enabled` | BOOLEAN | `false` | Public business profile toggle |
| `public_profile_slug` | TEXT | — | URL slug for public profile page |
| `public_profile_about` | TEXT | — | About text for public profile |
| `public_profile_social_links` | TEXT (JSON) | — | `{instagram, facebook, youtube, website}` |

**RLS:** Only the owner (`owner_user_id = auth.uid()`) can read/create/update/delete.

---

### 2.3 `WorkspaceMember`

Maps users to workspaces with specific roles (for multi-user teams).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `user_id` | UUID FK → `auth.users.id` | — | **Required.** |
| `role` | TEXT | `owner` | `owner` \| `admin` \| `accountant` \| `manager` \| `staff` |
| `status` | TEXT | `active` | `active` \| `invited` \| `removed` |

**RLS:** Users can only read/create/update/delete records where `user_id = auth.uid()`.

---

## 3. CRM Tables

### 3.1 `Client`

| Column | Type | Notes |
|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | **Required.** |
| `name` | TEXT | **Required.** Client name |
| `phone` | TEXT | |
| `alternate_phone` | TEXT | |
| `email` | TEXT | |
| `address` | TEXT | |
| `city` | TEXT | |
| `state` | TEXT | |
| `country` | TEXT | |
| `notes` | TEXT | |

**RLS:** Only `created_by = auth.uid()` (owner-creator access).

**Relationships:** One client → many Events, Quotations, Invoices, FinancialTransactions.

---

### 3.2 `TeamMember`

Internal team/crew roster. Each member gets a unique color for visual identification.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** |
| `phone` | TEXT | — | |
| `email` | TEXT | — | |
| `role_id` | UUID FK → `TeamRole.id` | — | Primary role |
| `profession` | TEXT | — | Free-text profession |
| `is_self` | BOOLEAN | `false` | True if this is the workspace owner's own roster entry |
| `member_type_id` | TEXT | — | Legacy — event-specific, use assignments |
| `color` | TEXT | `#0d9488` | Hex color for visual ID across calendar/cards |
| `default_rate` | NUMERIC | `0` | Legacy — rate comes from Role |
| `rate_type` | TEXT | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` (legacy) |
| `notes` | TEXT | — | |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Only `created_by = auth.uid()`.

**Relationships:** One TeamMember → many EventTeamAssignment, FinancialTransaction (TEAM_PAYMENT), TeamBlockDate.

---

### 3.3 `TeamRole`

Role master (e.g. Photographer, Decorator, Coordinator).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** Role name |
| `default_rate` | NUMERIC | `0` | Default pay rate |
| `rate_type` | TEXT | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Only `created_by = auth.uid()`.

---

### 3.4 `Service`

Service catalog (e.g. Album, Drone Shoot, Catering).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** |
| `description` | TEXT | — | |
| `default_rate` | NUMERIC | `0` | |
| `rate_type` | TEXT | `Fixed` | `Fixed` \| `Per Day` \| `Per Unit` |
| `gst_rate` | NUMERIC | `0` | GST % for this service |
| `sac_code` | TEXT | — | SAC code for GST |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Read by `created_by = auth.uid()`. Create is open to authenticated users.

---

### 3.5 `ServiceProvider`

External service providers (vendors/suppliers, not internal team).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** |
| `phone` | TEXT | — | |
| `email` | TEXT | — | |
| `notes` | TEXT | — | |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Only `created_by = auth.uid()`.

---

## 4. Event / Project Tables

### 4.1 `Event`

The central project/event entity. Called "Event" but supports multi-industry (photography shoots, architecture projects, etc.).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `client_id` | UUID FK → `Client.id` | — | **Required.** |
| `title` | TEXT | — | **Required.** Event/project title |
| `event_type` | TEXT | — | From workspace event_types config |
| `start_date` | DATE | — | **Required.** |
| `end_date` | DATE | — | |
| `event_dates` | TEXT[] (JSON array) | `[]` | Non-consecutive dates |
| `financial_year` | TEXT | — | e.g. `2026-27` (derived from FY) |
| `team_member_ids` | TEXT[] (JSON array) | `[]` | Quick-reference assigned member IDs |
| `service_ids` | TEXT[] (JSON array) | `[]` | Quick-reference selected service IDs |
| `venue` | TEXT | — | |
| `venue_address` | TEXT | — | |
| `status` | TEXT | `upcoming` | `upcoming` \| `in-progress` \| `completed` \| `cancelled` |
| `contract_value` | NUMERIC | `0` | Total agreed amount |
| `description` | TEXT | — | |
| `notes` | TEXT | — | Internal notes |

**RLS:** Only `created_by = auth.uid()`. Create is open to authenticated users.

**Relationships:** One Event → many EventTeamAssignment, EventServiceAssignment, EventDayAssignment, Quotation, Invoice, FinancialTransaction, JobSheet, EventReminder.

---

### 4.2 `EventTeamAssignment`

Links team members to an event with their specific role, rate, and working dates.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `team_member_id` | UUID FK → `TeamMember.id` | — | **Required.** |
| `role_id` | UUID FK → `TeamRole.id` | — | Role for this assignment |
| `role_name_snapshot` | TEXT | — | Frozen role name at assignment time |
| `member_type_id` | TEXT | — | e.g. Bride Side / Groom Side |
| `member_type_snapshot` | TEXT | — | Frozen member type name |
| `agreed_rate` | NUMERIC | `0` | Event-specific agreed pay |
| `rate_type` | TEXT | `Per Event` | `Per Event` \| `Per Day` \| `Fixed` |
| `working_dates` | TEXT[] (JSON array) | `[]` | Selected event dates this member works |
| `booking_start_date` | DATE | — | Per-member booking start |
| `booking_end_date` | DATE | — | Per-member booking end |
| `assignment_status` | TEXT | `assigned` | `assigned` \| `removed` |
| `notes` | TEXT | — | |

**RLS:** Only `created_by = auth.uid()`.

---

### 4.3 `EventServiceAssignment`

Links services to an event with agreed rates and optional provider.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `service_id` | UUID FK → `Service.id` | — | **Required.** |
| `service_name_snapshot` | TEXT | — | Frozen service name |
| `provider_id` | UUID FK → `TeamMember.id` | — | Optional provider team member |
| `provider_name_snapshot` | TEXT | — | Frozen provider name |
| `agreed_rate` | NUMERIC | `0` | Event-specific rate |
| `rate_type` | TEXT | `Fixed` | `Fixed` \| `Per Day` \| `Per Unit` |
| `is_addon` | BOOLEAN | `false` | Last-minute add-on (adds to contract value) |
| `assignment_status` | TEXT | `assigned` | `assigned` \| `removed` |
| `notes` | TEXT | — | |

**RLS:** Only `created_by = auth.uid()`.

---

### 4.4 `EventDayAssignment`

Per-day team/service assignments for multi-day events with non-consecutive dates.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `date` | DATE | — | **Required.** |
| `team_member_ids` | TEXT[] (JSON array) | `[]` | Members working this specific date |
| `service_ids` | TEXT[] (JSON array) | `[]` | Services for this specific date |
| `venue_override` | TEXT | — | Per-day venue |
| `notes` | TEXT | — | Day-specific notes |
| `status` | TEXT | `planned` | `planned` \| `confirmed` \| `done` \| `cancelled` |

**RLS:** Only `created_by = auth.uid()`.

---

### 4.5 `EventReminder`

Scheduled reminders for events.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `reminder_type` | TEXT | `24_hours` | `24_hours` \| `48_hours` \| `custom` |
| `custom_hours` | NUMERIC | `0` | Hours before (for custom type) |
| `scheduled_for` | TIMESTAMPTZ | — | When reminder should fire |
| `status` | TEXT | `pending` | `pending` \| `sent` \| `cancelled` |

**RLS:** Only `created_by = auth.uid()`.

---

### 4.6 `TeamBlockDate`

Leave/blocked dates for team members (unavailability).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `team_member_id` | UUID FK → `TeamMember.id` | — | **Required.** |
| `start_date` | DATE | — | **Required.** |
| `end_date` | DATE | — | |
| `reason` | TEXT | `Leave` | |
| `status` | TEXT | `active` | `active` \| `cancelled` |

**RLS:** Only `created_by = auth.uid()`.

---

## 5. Quotation Tables

### 5.1 `Quotation`

The main quotation entity with full financial calculations and immutable snapshots.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `quotation_number` | TEXT | — | **Required.** Unique quote number |
| `client_id` | UUID FK → `Client.id` | — | |
| `event_id` | UUID FK → `Event.id` | — | Optional link to event |
| `quotation_date` | DATE | — | **Required.** |
| `valid_until` | DATE | — | Quotation expiry date |
| `status` | TEXT | `draft` | `draft` \| `finalized` \| `accepted` \| `rejected` \| `expired` \| `cancelled` |
| `category` | TEXT | `PHOTOGRAPHY` | `PHOTOGRAPHY` \| `EVENT_MANAGEMENT` \| `ARCHITECTURE` \| `OTHER` |
| `context_type` | TEXT | — | e.g. `bride_side`, `groom_side`, `common`, `residential`, `commercial` |
| `start_date` | DATE | — | Project/event start |
| `end_date` | DATE | — | Project/event end |
| `excluded_dates` | TEXT[] (JSON array) | `[]` | Dates not in scope |
| `show_pricing` | BOOLEAN | `true` | Show qty/rate/amount to client |
| `template_id` | TEXT | `gold_premium` | PDF template ID |
| `template_config` | TEXT (JSON) | — | Template custom config |
| `project_title` | TEXT | — | |
| `project_summary` | TEXT | — | |
| `subtotal` | NUMERIC | `0` | |
| `discount_type` | TEXT | `percent` | `percent` \| `fixed` |
| `discount_value` | NUMERIC | `0` | |
| `discount_amount` | NUMERIC | `0` | Calculated discount |
| `taxable_amount` | NUMERIC | `0` | |
| `gst_applicable` | BOOLEAN | `false` | |
| `gst_mode` | TEXT | `cgst_sgst` | `cgst_sgst` \| `igst` |
| `cgst_amount` | NUMERIC | `0` | |
| `sgst_amount` | NUMERIC | `0` | |
| `igst_amount` | NUMERIC | `0` | |
| `gst_total` | NUMERIC | `0` | |
| `grand_total` | NUMERIC | `0` | |
| `payment_schedule_json` | TEXT (JSON) | — | Payment milestones JSON |
| `terms_and_conditions` | TEXT | — | |
| `special_notes` | TEXT | — | Scope-specific notes |
| `notes` | TEXT | — | Internal notes |
| `bank_details_snapshot` | TEXT (JSON) | — | Frozen bank/UPI details |
| `social_links_snapshot` | TEXT (JSON) | — | Frozen social links |
| `footer_message` | TEXT | — | Thank you message |
| `client_snapshot` | TEXT (JSON) | — | Frozen client data |
| `business_snapshot` | TEXT (JSON) | — | Frozen business data |
| `event_snapshot` | TEXT (JSON) | — | Frozen event data |
| `client_signature` | TEXT | — | Signature data URL |
| `signed_by_name` | TEXT | — | Client name who signed |
| `signed_at` | TIMESTAMPTZ | — | When signed |
| `client_access_password` | TEXT | — | Optional gate for online link |
| `public_token` | TEXT | — | Secure random token for portal URL |
| `public_link_enabled` | BOOLEAN | `false` | Admin master control |
| `hide_team_names` | BOOLEAN | `false` | Hide team names on portal |
| `portal_first_viewed_at` | TIMESTAMPTZ | — | |
| `portal_latest_viewed_at` | TIMESTAMPTZ | — | |
| `portal_view_count` | NUMERIC | `0` | |
| `sync_pending` | BOOLEAN | `false` | Accepted quote needs Event+FY sync |
| `sync_completed_at` | TIMESTAMPTZ | — | |

**RLS:** Only `created_by = auth.uid()`.

---

### 5.2 `QuotationItem`

Line items within a quotation. Supports services, roles, team members, and custom items.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `quotation_id` | UUID FK → `Quotation.id` | — | **Required.** |
| `item_type` | TEXT | `custom` | `service` \| `role` \| `team` \| `custom` |
| `reference_id` | TEXT | — | service_id, role_id, or team_member_id |
| `team_member_id` | UUID FK → `TeamMember.id` | — | For team-type items |
| `team_member_name_snapshot` | TEXT | — | Frozen member name |
| `member_type` | TEXT | — | `bride_side` \| `groom_side` \| `common` \| `other` |
| `day_date` | DATE | — | Which day/phase this belongs to |
| `phase_title` | TEXT | — | e.g. Haldi, Sangeet, Site Measurement |
| `is_addon` | BOOLEAN | `false` | Last-minute add-on |
| `name` | TEXT | — | **Required.** Item name |
| `description` | TEXT | — | |
| `quantity` | NUMERIC | `1` | |
| `days` | NUMERIC | `1` | |
| `unit_rate` | NUMERIC | `0` | |
| `rate_type` | TEXT | `Fixed` | `Fixed` \| `Per Day` \| `Per Unit` \| `Per Event` |
| `line_total` | NUMERIC | `0` | |
| `gst_rate` | NUMERIC | `0` | |
| `sac_code` | TEXT | — | |
| `sort_order` | NUMERIC | `0` | |

**RLS:** Only `created_by = auth.uid()`.

---

### 5.3 `QuotationPackage`

Reusable quotation templates/packages.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** |
| `description` | TEXT | — | |
| `category` | TEXT | `PHOTOGRAPHY` | `PHOTOGRAPHY` \| `EVENT_MANAGEMENT` \| `ARCHITECTURE` \| `OTHER` |
| `structure_json` | TEXT (JSON) | — | Full package structure (days, team, services, terms) |
| `terms_and_conditions` | TEXT | — | Default T&C |
| `footer_message` | TEXT | — | Default footer |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Only `created_by = auth.uid()`.

---

## 6. Invoice Tables

### 6.1 `Invoice`

The main invoice entity with immutable snapshots and milestone support.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `invoice_number` | TEXT | — | **Required.** Unique invoice number |
| `quotation_id` | UUID FK → `Quotation.id` | — | Source quotation (optional) |
| `client_id` | UUID FK → `Client.id` | — | |
| `event_id` | UUID FK → `Event.id` | — | |
| `invoice_date` | DATE | — | **Required.** |
| `due_date` | DATE | — | |
| `due_date_type` | TEXT | `due_on_receipt` | `due_on_receipt` \| `net_15` \| `net_30` \| `custom` |
| `invoice_type` | TEXT | `manual` | `full` \| `milestone` \| `manual` |
| `milestone_id` | UUID FK → `PaymentMilestone.id` | — | For milestone-type invoices |
| `milestone_tag` | TEXT | `Full Payment` | `Advance` \| `Event Day` \| `Final Handover` \| `Full Payment` \| `Custom` |
| `status` | TEXT | `draft` | `draft` \| `due` \| `sent` \| `paid` \| `partial` \| `overdue` \| `cancelled` |
| `show_itemized_rates` | BOOLEAN | `true` | Show rates on PDF & public link |
| `subtotal` | NUMERIC | `0` | |
| `discount_type` | TEXT | `percent` | `percent` \| `fixed` |
| `discount_value` | NUMERIC | `0` | |
| `discount_amount` | NUMERIC | `0` | |
| `taxable_amount` | NUMERIC | `0` | |
| `gst_applicable` | BOOLEAN | `false` | |
| `gst_rate` | NUMERIC | `0` | |
| `gst_mode` | TEXT | `cgst_sgst` | `cgst_sgst` \| `igst` |
| `cgst_amount` | NUMERIC | `0` | |
| `sgst_amount` | NUMERIC | `0` | |
| `igst_amount` | NUMERIC | `0` | |
| `gst_total` | NUMERIC | `0` | |
| `grand_total` | NUMERIC | `0` | |
| `amount_paid` | NUMERIC | `0` | |
| `balance_due` | NUMERIC | `0` | |
| `amount_in_words` | TEXT | — | Total in words |
| `payment_schedule_json` | TEXT (JSON) | — | |
| `client_snapshot` | TEXT (JSON) | — | Frozen client data |
| `business_snapshot` | TEXT (JSON) | — | Frozen business data |
| `event_snapshot` | TEXT (JSON) | — | Frozen event data |
| `bank_details_snapshot` | TEXT (JSON) | — | Frozen bank/UPI details |
| `social_links_snapshot` | TEXT (JSON) | — | Frozen social links |
| `authorized_signatory` | TEXT | — | Signatory name |
| `notes` | TEXT | — | Internal notes (never shown to client) |
| `payment_terms` | TEXT | — | Client-visible payment terms |
| `terms_and_conditions` | TEXT | — | Client-visible T&C |
| `public_token` | TEXT | — | Secure random token for public URL |
| `public_link_enabled` | BOOLEAN | `false` | Admin master control |
| `portal_view_count` | NUMERIC | `0` | |
| `portal_first_viewed_at` | TIMESTAMPTZ | — | |
| `portal_latest_viewed_at` | TIMESTAMPTZ | — | |

**RLS:** Only `created_by = auth.uid()`.

---

### 6.2 `InvoiceItem`

Line items within an invoice.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `invoice_id` | UUID FK → `Invoice.id` | — | **Required.** |
| `item_type` | TEXT | `line_item` | `package` \| `line_item` |
| `name` | TEXT | — | **Required.** |
| `description` | TEXT | — | |
| `deliverables` | TEXT | — | Newline-separated deliverable list |
| `quantity` | NUMERIC | `1` | |
| `unit_rate` | NUMERIC | `0` | |
| `line_total` | NUMERIC | `0` | |
| `events_json` | TEXT (JSON) | — | Nested events for package type |
| `sort_order` | NUMERIC | `0` | |

**RLS:** Only `created_by = auth.uid()`.

---

### 6.3 `PaymentMilestone`

Payment milestones linked to quotations (payment schedule).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `quotation_id` | UUID FK → `Quotation.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | |
| `client_id` | UUID FK → `Client.id` | — | |
| `name` | TEXT | — | **Required.** Milestone name |
| `description` | TEXT | — | |
| `sort_order` | NUMERIC | `0` | |
| `milestone_type` | TEXT | `percent` | `percent` \| `fixed` |
| `milestone_value` | NUMERIC | `0` | % or fixed amount |
| `due_amount` | NUMERIC | `0` | Calculated from quotation total |
| `paid_amount` | NUMERIC | `0` | From linked CLIENT_RECEIPT transactions |
| `due_condition` | TEXT | — | e.g. "On signing", "On event day" |
| `due_date` | DATE | — | |
| `status` | TEXT | `upcoming` | `upcoming` \| `due` \| `partially_paid` \| `paid` \| `overdue` |
| `financial_year_id` | UUID FK → `FinancialYear.id` | — | |

**RLS:** Only `created_by = auth.uid()`.

---

## 7. Financial Tables

### 7.1 `FinancialYear`

Workspace-level financial year master (India: April 1 – March 31).

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `fy_id` | TEXT | — | **Required.** e.g. `FY2026-27` |
| `label` | TEXT | — | **Required.** e.g. `April 2026 - March 2027` |
| `start_date` | DATE | — | **Required.** |
| `end_date` | DATE | — | **Required.** |
| `is_active` | BOOLEAN | `false` | Workspace default FY |
| `status` | TEXT | `open` | `open` \| `closed` |

**RLS:** Only `created_by = auth.uid()`.

---

### 7.2 `FinancialTransaction`

All financial movements: client receipts, team payments, business expenses.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `financial_year_id` | UUID FK → `FinancialYear.id` | — | **Required** (coupled by transaction date) |
| `event_id` | UUID FK → `Event.id` | — | |
| `transaction_type` | TEXT | — | **Required.** `CLIENT_RECEIPT` \| `TEAM_PAYMENT` \| `BUSINESS_EXPENSE` |
| `client_id` | UUID FK → `Client.id` | — | For CLIENT_RECEIPT |
| `team_member_id` | UUID FK → `TeamMember.id` | — | For TEAM_PAYMENT |
| `team_assignment_id` | UUID FK → `EventTeamAssignment.id` | — | |
| `service_assignment_id` | UUID FK → `EventServiceAssignment.id` | — | |
| `milestone_id` | UUID FK → `PaymentMilestone.id` | — | For milestone-linked receipts |
| `invoice_id` | UUID FK → `Invoice.id` | — | For invoice-linked receipts |
| `expense_category_id` | UUID FK → `ExpenseCategory.id` | — | For BUSINESS_EXPENSE |
| `expense_category_name_snapshot` | TEXT | — | Frozen category name |
| `amount` | NUMERIC | `0` | **Required.** |
| `payment_method` | TEXT | `Cash` | `Cash` \| `UPI` \| `Bank Transfer` \| `Card` \| `Cheque` \| `Other` |
| `transaction_date` | DATE | — | **Required.** |
| `reference_number` | TEXT | — | UTR/cheque number |
| `notes` | TEXT | — | |
| `status` | TEXT | `ACTIVE` | `ACTIVE` \| `VOID` |

**RLS:** Only `created_by = auth.uid()`.

**Direction logic:**
- `CLIENT_RECEIPT` → money IN (+) → green
- `TEAM_PAYMENT` → money OUT (−) → red
- `BUSINESS_EXPENSE` → money OUT (−) → red

---

### 7.3 `ExpenseCategory`

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `name` | TEXT | — | **Required.** |
| `status` | TEXT | `active` | `active` \| `inactive` |

**RLS:** Only `created_by = auth.uid()`.

---

## 8. Job Sheet Tables

### 8.1 `JobSheet`

Operational job sheet for crew execution, linked to an event.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `quotation_id` | UUID FK → `Quotation.id` | — | |
| `show_team_names` | BOOLEAN | `false` | Show names vs roles only |
| `include_crew_contacts` | BOOLEAN | `false` | Include contact directory |
| `include_equipment` | BOOLEAN | `false` | Include equipment checklist |
| `equipment_list` | TEXT (JSON) | — | JSON array of strings |
| `deliverables` | TEXT (JSON) | — | JSON array of strings |
| `date_configs` | TEXT (JSON) | — | `{date: {reporting_time, phase_title, venue_override}}` |
| `internal_notes` | TEXT | — | |
| `status` | TEXT | `active` | `active` \| `archived` |
| `public_token` | TEXT | — | Secure token for crew URL |
| `public_link_enabled` | BOOLEAN | `false` | Admin master control |
| `portal_view_count` | NUMERIC | `0` | |
| `portal_first_viewed_at` | TIMESTAMPTZ | — | |
| `portal_latest_viewed_at` | TIMESTAMPTZ | — | |

**RLS:** Only `created_by = auth.uid()`.

---

## 9. Public Portal Tables

### 9.1 `QuotationPortal`

Public portal token manager for client-facing quotation views.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `quotation_id` | UUID FK → `Quotation.id` | — | **Required.** |
| `public_token` | TEXT | — | **Required.** Secure random token |
| `is_enabled` | BOOLEAN | `true` | Master on/off switch |
| `view_count` | NUMERIC | `0` | |
| `first_viewed_at` | TIMESTAMPTZ | — | |
| `last_viewed_at` | TIMESTAMPTZ | — | |

**RLS:** Workspace members + platform admins.

---

### 9.2 `JobSheetPortal`

Public portal token manager for crew-facing job sheets.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `event_id` | UUID FK → `Event.id` | — | **Required.** |
| `public_token` | TEXT | — | **Required.** Secure random token |
| `is_enabled` | BOOLEAN | `true` | Master on/off switch |
| `view_count` | NUMERIC | `0` | |
| `first_viewed_at` | TIMESTAMPTZ | — | |
| `last_viewed_at` | TIMESTAMPTZ | — | |

**RLS:** Workspace members + platform admins.

---

## 10. SaaS / Subscription Tables

### 10.1 `Plan`

SaaS plan definitions (platform-level, not workspace-scoped).

| Column | Type | Default | Notes |
|---|---|---|---|
| `code` | TEXT | — | **Required.** e.g. `FREE`, `PRO` |
| `name` | TEXT | — | **Required.** Display name |
| `description` | TEXT | — | |
| `is_active` | BOOLEAN | `true` | |
| `sort_order` | NUMERIC | `0` | |

**RLS:** Public read. Admin-only write.

---

### 10.2 `PlanLimit`

Feature limits per plan.

| Column | Type | Default | Notes |
|---|---|---|---|
| `plan_id` | UUID FK → `Plan.id` | — | **Required.** |
| `limit_key` | TEXT | — | **Required.** `max_events` \| `max_team_members` \| `max_services` \| `max_storage_gb` \| `pdf_export_enabled` \| `reminders_enabled` |
| `limit_value` | TEXT | — | **Required.** Number or `true`/`false` |
| `enabled` | BOOLEAN | `true` | |

**RLS:** Public read. Admin-only write.

---

### 10.3 `PlanPricing`

Pricing tiers per plan per billing cycle.

| Column | Type | Default | Notes |
|---|---|---|---|
| `plan_id` | UUID FK → `Plan.id` | — | **Required.** |
| `billing_cycle` | TEXT | — | **Required.** `MONTHLY` \| `SIX_MONTHS` \| `ANNUAL` |
| `price` | NUMERIC | `0` | **Required.** |
| `currency` | TEXT | `INR` | |
| `duration_months` | NUMERIC | `1` | **Required.** |
| `storage_gb` | NUMERIC | `0` | Database storage |
| `is_active` | BOOLEAN | `true` | |
| `sort_order` | NUMERIC | `0` | |

**RLS:** Public read. Admin-only write.

---

### 10.4 `WorkspaceSubscription`

Active subscription per workspace.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `plan_id` | UUID FK → `Plan.id` | — | **Required.** |
| `pricing_id` | UUID FK → `PlanPricing.id` | — | |
| `status` | TEXT | `ACTIVE` | **Required.** `ACTIVE` \| `EXPIRED` \| `CANCELLED` \| `SUSPENDED` |
| `started_at` | DATE | — | |
| `expires_at` | DATE | — | |
| `auto_renew` | BOOLEAN | `false` | |
| `source` | TEXT | `ADMIN` | `ADMIN` \| `PAYMENT_GATEWAY` \| `PROMOTIONAL` \| `ONBOARDING` |
| `assigned_price` | NUMERIC | `0` | Price snapshot |
| `billing_cycle_snapshot` | TEXT | — | |
| `updated_by` | UUID FK → `auth.users.id` | — | |
| `note` | TEXT | — | Reason for change |

**RLS:** Creator read + admin. Admin-only write.

---

### 10.5 `SubscriptionPayment`

Payment records for subscription purchases.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `subscription_id` | UUID FK → `WorkspaceSubscription.id` | — | |
| `plan_id` | UUID FK → `Plan.id` | — | |
| `pricing_id` | UUID FK → `PlanPricing.id` | — | |
| `amount` | NUMERIC | `0` | **Required.** |
| `currency` | TEXT | `INR` | |
| `gateway` | TEXT | `stripe` | Payment gateway |
| `gateway_order_id` | TEXT | — | Order/session ID |
| `gateway_payment_id` | TEXT | — | Payment ID |
| `billing_cycle_snapshot` | TEXT | — | |
| `status` | TEXT | `CREATED` | **Required.** `CREATED` \| `SUCCESS` \| `FAILED` \| `REFUNDED` |
| `verified_at` | TIMESTAMPTZ | — | |
| `failure_reason` | TEXT | — | |

**RLS:** Creator read + admin. Admin-only update/delete.

---

### 10.6 `UpgradeRequest`

User-submitted upgrade requests.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `requested_plan` | TEXT | `PRO` | |
| `requested_pricing_id` | UUID FK → `PlanPricing.id` | — | |
| `status` | TEXT | `PENDING` | **Required.** `PENDING` \| `APPROVED` \| `REJECTED` |
| `requested_at` | TIMESTAMPTZ | — | |
| `reviewed_at` | TIMESTAMPTZ | — | |
| `reviewed_by` | UUID FK → `auth.users.id` | — | |
| `note` | TEXT | — | |

**RLS:** Creator read + admin. Admin-only update/delete.

---

## 11. System Tables

### 11.1 `Notification`

In-app notifications for users.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `user_id` | UUID FK → `auth.users.id` | — | **Required.** Target user |
| `type` | TEXT | — | **Required.** `event_reminder` \| `payment_due` \| `subscription_expiring` \| `subscription_expired` \| `team_conflict` \| `general` |
| `title` | TEXT | — | **Required.** |
| `message` | TEXT | — | |
| `related_entity_type` | TEXT | — | |
| `related_entity_id` | UUID | — | |
| `read` | BOOLEAN | `false` | |

**RLS:** Users read/update/delete own (`user_id = auth.uid()`). Admin-only create.

---

### 11.2 `SupportTicket`

User support tickets.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `user_id` | UUID FK → `auth.users.id` | — | **Required.** |
| `user_name` | TEXT | — | Snapshot |
| `user_email` | TEXT | — | Snapshot |
| `subject` | TEXT | — | **Required.** |
| `message` | TEXT | — | **Required.** |
| `category` | TEXT | `general` | `bug` \| `feature_request` \| `billing` \| `account` \| `general` |
| `priority` | TEXT | `medium` | `low` \| `medium` \| `high` \| `urgent` |
| `status` | TEXT | `open` | `open` \| `in_progress` \| `resolved` \| `closed` |
| `admin_response` | TEXT | — | |
| `resolved_at` | TIMESTAMPTZ | — | |

**RLS:** Users read/create own. Admin-only update/delete.

---

### 11.3 `StorageUsage`

Storage tracking per workspace.

| Column | Type | Default | Notes |
|---|---|---|---|
| `workspace_id` | UUID FK → `Workspace.id` | — | **Required.** |
| `total_bytes` | NUMERIC | `0` | |
| `file_count` | NUMERIC | `0` | |

**RLS:** Admin-only (all operations).

---

### 11.4 `PushSubscription`

Per-device push notification credentials for web push (VAPID) and native push (FCM/APNs).

| Column | Type | Default | Notes |
|---|---|---|---|
| `user_id` | UUID FK → `auth.users.id` | — | **Required.** |
| `platform` | TEXT | — | **Required.** `web` \| `android` \| `ios` |
| `endpoint` | TEXT | — | Push service endpoint URL (web push) |
| `push_token` | TEXT | — | FCM/APNs device token (native push) |
| `p256dh_key` | TEXT | — | ECDH P-256 public key (base64url, web push) |
| `auth_key` | TEXT | — | Auth secret (base64url, web push) |

**RLS:** Users manage only their own subscriptions (`user_id = auth.uid()`).

---

### 11.5 `UserAuthCredential`

WebAuthn credential storage for app lock / biometric authentication.

| Column | Type | Default | Notes |
|---|---|---|---|
| `user_id` | UUID FK → `auth.users.id` | — | **Required.** |
| `credential_id` | TEXT | — | **Required.** Credential ID (base64url) |
| `public_key` | TEXT | — | **Required.** Public key (JSON JWK string) |
| `counter` | INTEGER | `0` | Signature counter (replay protection) |
| `device_label` | TEXT | — | User-friendly device label |
| `transports` | TEXT (JSON) | — | JSON array: `internal`, `hybrid`, `usb`, `nfc`, `ble` |

**RLS:** Users manage only their own credentials (`user_id = auth.uid()`).

---

## 12. Entity Relationship Diagram (Text)

```
auth.users
  │
  ├── 1:1 ── User (profiles)
  │             ├── role: admin | user | client | team_member
  │             ├── linked_client_id → Client.id
  │             ├── linked_team_member_id → TeamMember.id
  │             ├── 1:N ── PushSubscription
  │             └── 1:N ── UserAuthCredential
  │
  ├── 1:N ── Workspace (as owner_user_id)
  │             ├── 1:N ── WorkspaceMember
  │             ├── 1:N ── Client
  │             │             ├── 1:N ── Event
  │             │             ├── 1:N ── Quotation
  │             │             ├── 1:N ── Invoice
  │             │             └── 1:N ── FinancialTransaction (CLIENT_RECEIPT)
  │             ├── 1:N ── TeamMember
  │             │             ├── 1:N ── EventTeamAssignment
  │             │             ├── 1:N ── FinancialTransaction (TEAM_PAYMENT)
  │             │             └── 1:N ── TeamBlockDate
  │             ├── 1:N ── TeamRole
  │             ├── 1:N ── Service
  │             │             └── 1:N ── EventServiceAssignment
  │             ├── 1:N ── ServiceProvider
  │             ├── 1:N ── Event
  │             │             ├── 1:N ── EventTeamAssignment
  │             │             ├── 1:N ── EventServiceAssignment
  │             │             ├── 1:N ── EventDayAssignment
  │             │             ├── 1:N ── EventReminder
  │             │             ├── 1:N ── Quotation
  │             │             ├── 1:N ── Invoice
  │             │             ├── 1:1 ── JobSheet
  │             │             └── 1:N ── FinancialTransaction
  │             ├── 1:N ── Quotation
  │             │             ├── 1:N ── QuotationItem
  │             │             ├── 1:N ── PaymentMilestone
  │             │             ├── 1:1 ── QuotationPortal
  │             │             └── 1:N ── Invoice (via quotation_id)
  │             ├── 1:N ── Invoice
  │             │             ├── 1:N ── InvoiceItem
  │             │             └── 1:1 ── (public_token → PublicInvoice)
  │             ├── 1:N ── FinancialYear
  │             │             └── 1:N ── FinancialTransaction (via financial_year_id)
  │             ├── 1:N ── FinancialTransaction
  │             ├── 1:N ── ExpenseCategory
  │             ├── 1:N ── QuotationPackage
  │             ├── 1:N ── Notification
  │             ├── 1:N ── SupportTicket
  │             ├── 1:1 ── StorageUsage
  │             ├── 1:N ── WorkspaceSubscription
  │             │             └── 1:N ── SubscriptionPayment
  │             └── 1:N ── UpgradeRequest
  │
  └── (admin) ── Plan
                    ├── 1:N ── PlanLimit
                    ├── 1:N ── PlanPricing
                    └── 1:N ── WorkspaceSubscription
```

---

## 13. Supabase RLS Translation Guide

Base44 uses a declarative RLS system. Here's how to translate it to Supabase Postgres RLS policies:

### Pattern 1: Owner-only access (`created_by_id = {{user.id}}`)

**Base44:**
```json
"rls": {
  "read": { "created_by_id": "{{user.id}}" },
  "update": { "created_by_id": "{{user.id}}" },
  "delete": { "created_by_id": "{{user.id}}" },
  "create": { "created_by_id": "{{user.id}}" }
}
```

**Supabase SQL:**
```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON clients
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "owner_insert" ON clients
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "owner_update" ON clients
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "owner_delete" ON clients
  FOR DELETE USING (created_by = auth.uid());
```

### Pattern 2: Workspace owner access (`data.owner_user_id = {{user.id}}`)

**Supabase SQL:**
```sql
CREATE POLICY "workspace_owner_all" ON workspaces
  FOR ALL USING (owner_user_id = auth.uid());
```

### Pattern 3: User-specific records (`data.user_id = {{user.id}}`)

**Supabase SQL:**
```sql
CREATE POLICY "user_own_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_own_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
```

### Pattern 4: Admin-only operations (`user_condition: { role: "admin" }`)

**Supabase SQL:**
```sql
-- Requires a profiles table with role column
CREATE POLICY "admin_all" ON plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Pattern 5: Workspace membership (`data.workspace_id IN {{user.data.workspace_ids}}`)

**Supabase SQL:**
```sql
CREATE POLICY "workspace_member_read" ON quotation_portals
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
```

---

## 14. Migration Notes

### 14.1 JSON Columns

Several columns store JSON as TEXT (not JSONB). For Supabase, convert these to `JSONB` for better querying:

```sql
-- Example: Workspace.display_preferences
ALTER TABLE workspaces
  ALTER COLUMN display_preferences TYPE JSONB
  USING display_preferences::jsonb;
```

**JSON columns to convert:**
- `Workspace.team_member_types` → JSONB
- `Workspace.event_types` → JSONB
- `Workspace.display_preferences` → JSONB
- `Quotation.payment_schedule_json` → JSONB
- `Quotation.client_snapshot` → JSONB
- `Quotation.business_snapshot` → JSONB
- `Quotation.event_snapshot` → JSONB
- `Quotation.bank_details_snapshot` → JSONB
- `Quotation.social_links_snapshot` → JSONB
- `Quotation.template_config` → JSONB
- `Invoice.payment_schedule_json` → JSONB
- `Invoice.client_snapshot` → JSONB
- `Invoice.business_snapshot` → JSONB
- `Invoice.event_snapshot` → JSONB
- `Invoice.bank_details_snapshot` → JSONB
- `Invoice.social_links_snapshot` → JSONB
- `InvoiceItem.events_json` → JSONB
- `QuotationPackage.structure_json` → JSONB
- `JobSheet.equipment_list` → JSONB
- `JobSheet.deliverables` → JSONB
- `JobSheet.date_configs` → JSONB

### 14.2 Array Columns

These columns store arrays as JSON. Convert to Postgres native arrays:

- `Event.event_dates` → `DATE[]`
- `Event.team_member_ids` → `UUID[]`
- `Event.service_ids` → `UUID[]`
- `EventTeamAssignment.working_dates` → `DATE[]`
- `EventDayAssignment.team_member_ids` → `UUID[]`
- `EventDayAssignment.service_ids` → `UUID[]`
- `Quotation.excluded_dates` → `DATE[]`

### 14.3 Triggers Needed

1. **Auto-create profile on signup:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

2. **Auto-update `updated_at`:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table:
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 14.4 Indexes for Performance

```sql
-- Workspace scoping (most queries filter by workspace_id)
CREATE INDEX idx_clients_workspace ON clients(workspace_id);
CREATE INDEX idx_events_workspace ON events(workspace_id);
CREATE INDEX idx_quotations_workspace ON quotations(workspace_id);
CREATE INDEX idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX idx_transactions_workspace ON financial_transactions(workspace_id);
CREATE INDEX idx_team_members_workspace ON team_members(workspace_id);

-- Foreign key lookups
CREATE INDEX idx_events_client ON events(client_id);
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_transactions_fy ON financial_transactions(financial_year_id);
CREATE INDEX idx_assignments_event ON event_team_assignments(event_id);

-- Public token lookups (for public portal URLs)
CREATE UNIQUE INDEX idx_quotations_public_token ON quotations(public_token) WHERE public_token IS NOT NULL;
CREATE UNIQUE INDEX idx_invoices_public_token ON invoices(public_token) WHERE public_token IS NOT NULL;
CREATE UNIQUE INDEX idx_jobsheets_public_token ON job_sheets(public_token) WHERE public_token IS NOT NULL;
```

### 14.5 Total Table Count

**25 tables total:**

| # | Table | Purpose |
|---|---|---|
| 1 | `profiles` (User) | User profiles |
| 2 | `workspaces` | Business/tenant |
| 3 | `workspace_members` | Multi-user access |
| 4 | `clients` | Client CRM |
| 5 | `team_members` | Internal crew |
| 6 | `team_roles` | Role master |
| 7 | `services` | Service catalog |
| 8 | `service_providers` | External vendors |
| 9 | `events` | Projects/events |
| 10 | `event_team_assignments` | Team → event links |
| 11 | `event_service_assignments` | Service → event links |
| 12 | `event_day_assignments` | Per-day assignments |
| 13 | `event_reminders` | Scheduled reminders |
| 14 | `team_block_dates` | Unavailability/leave |
| 15 | `quotations` | Quotation master |
| 16 | `quotation_items` | Quotation line items |
| 17 | `quotation_packages` | Reusable templates |
| 18 | `payment_milestones` | Payment schedule |
| 19 | `invoices` | Invoice master |
| 20 | `invoice_items` | Invoice line items |
| 21 | `financial_years` | FY master |
| 22 | `financial_transactions` | All payments/expenses |
| 23 | `expense_categories` | Expense types |
| 24 | `job_sheets` | Crew job sheets |
| 25 | `quotation_portals` | Public quote portal tokens |
| 26 | `job_sheet_portals` | Public job sheet portal tokens |
| 27 | `notifications` | In-app notifications |
| 28 | `support_tickets` | Support system |
| 29 | `storage_usage` | Storage tracking |
| 30 | `plans` | SaaS plan definitions |
| 31 | `plan_limits` | Plan feature limits |
| 32 | `plan_pricing` | Plan pricing tiers |
| 33 | `workspace_subscriptions` | Active subscriptions |
| 34 | `subscription_payments` | Payment records |
| 35 | `upgrade_requests` | Upgrade requests |
| 36 | `push_subscriptions` | Per-device push notification credentials |
| 37 | `user_auth_credentials` | WebAuthn credentials for app lock |

---

*This document is auto-generated from the Base44 entity schemas. Use it as your Supabase migration blueprint.*