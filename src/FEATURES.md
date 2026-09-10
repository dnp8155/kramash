# Kramashah — Complete Features Report

> **Purpose:** This document lists every feature in the app, grouped by module, with a plain explanation of what each does. Update this file whenever a new feature is added or an existing one changes.
>
> **Last Updated:** 2026-09-10

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Dashboard](#2-dashboard)
3. [Client CRM](#3-client-crm)
4. [Team Management](#4-team-management)
5. [Services & Providers](#5-services--providers)
6. [Events / Projects](#6-events--projects)
7. [Quotation Engine](#7-quotation-engine)
8. [Invoice & Payments](#8-invoice--payments)
9. [Financial Management](#9-financial-management)
10. [Job Sheets](#10-job-sheets)
11. [Client Portal (Authenticated)](#11-client-portal-authenticated)
12. [Public Portals (Token-based)](#12-public-portals-token-based)
13. [Preferences & Settings](#13-preferences--settings)
14. [SaaS / Subscription System](#14-saas--subscription-system)
15. [Admin Panel](#15-admin-panel)
16. [Support & Help](#16-support--help)
17. [PWA & Offline](#17-pwa--offline)
18. [Notifications](#18-notifications)
19. [AI Agent](#19-ai-agent)
20. [Landing Page](#20-landing-page)

---

## 1. Authentication & Onboarding

### 1.1 Email + Password Login
- Standard email/password authentication
- "Remember me" session persistence
- Forgot password → reset email flow
- Reset password via token from email link

### 1.2 Google OAuth Login
- One-click Google sign-in
- Automatic account creation for new Google users
- Redirects to onboarding if no workspace exists

### 1.3 Phone OTP Login (Hidden — pending provider)
- Phone number entry → OTP sent
- OTP verification → session creation
- Currently returns 503 (external provider credentials pending)
- Hidden from UI until provider is configured

### 1.4 Registration
- Email + password + confirm password
- Google OAuth registration
- Multi-step flow: Register → OTP verification → session → redirect
- Resend OTP capability

### 1.5 Onboarding Wizard
- **Step 1:** Business name + business type selection
- **Step 2:** Business category (Photography / Event Management / Architecture / Other)
- **Step 3:** Custom work label (singular/plural — e.g. "Shoot"/"Shoots" vs "Event"/"Events")
- **Step 4:** Contact details (email, phone, address, city, state, country)
- **Step 5:** GST details (optional — GSTIN, registered name, billing address, default GST rate)
- Creates Workspace record + links user as owner
- Auto-creates initial Financial Year (current FY)
- Redirects to Dashboard on completion

### 1.6 Workspace Route Guard
- Authenticated users without a workspace → redirected to Onboarding
- Unauthenticated users → redirected to Login
- Session persistence across page refreshes

---

## 2. Dashboard

### 2.1 Overview Stats
- Total events count (active + completed)
- Total revenue (current financial year)
- Outstanding receivables (unpaid invoices)
- Team wages due (unpaid team assignments)

### 2.2 Upcoming Events Widget
- Next 5 upcoming events with date, client, venue
- Quick-click to event details
- Status badges (upcoming / in-progress)

### 2.3 Revenue Trend Chart
- Monthly revenue bar/line chart (current FY)
- Compares received vs pending
- Filterable by financial year

### 2.4 Team Availability Widget
- Shows which team members are booked this week
- Color-coded by member's assigned color
- Conflict indicators (double-booked dates)

### 2.5 Outstanding Dues Widget
- Top 5 clients with highest outstanding balances
- Quick action to send reminder or record payment

### 2.6 Team Wages Due Widget
- Top 5 team members with pending payments
- Agreed rate vs paid amount comparison

### 2.7 Fiscal Year Selector
- Dropdown to switch between financial years
- All dashboard stats recalculate based on selected FY

---

## 3. Client CRM

### 3.1 Client List
- Searchable, sortable table of all clients
- Columns: name, phone, email, city, total events, outstanding balance
- Pro plan: show client address column
- Quick actions: view, edit, delete

### 3.2 Client Details Page
- Full client profile (name, phone, alternate phone, email, address)
- Event history (all events for this client)
- Financial summary (total contracted, total received, outstanding)
- Quotation history
- Invoice history
- Payment history (all CLIENT_RECEIPT transactions)

### 3.3 Client Form (Add/Edit)
- Name (required), phone, alternate phone, email
- Address, city, state, country
- Notes
- Validation on required fields

### 3.4 Quick Client Form
- Inline mini-form for fast client creation from other pages (e.g. from Event Editor)
- Only essential fields (name, phone, email)

### 3.5 Client Financial Summary Card
- Total contract value across all events
- Total received (all CLIENT_RECEIPT transactions)
- Outstanding balance
- Visual progress bar

---

## 4. Team Management

### 4.1 Team Member List
- Grid/card view of all team members
- Each card shows: name, role, color accent bar, status, upcoming bookings count
- Color-coded accent (auto-assigned hex color)
- Quick actions: view, edit, archive, delete
- Pro plan: show address/services on cards

### 4.2 Team Member Details
- Full profile (name, phone, email, role, profession, notes)
- Upcoming bookings list (next 10 events assigned)
- Financial summary (total earned, total paid, pending)
- Availability calendar (shows booked dates + blocked dates)
- Per-person statement (all TEAM_PAYMENT transactions)

### 4.3 Team Member Form (Add/Edit)
- Name (required), phone, email
- Role assignment (from TeamRole master)
- Profession (free text)
- Color picker (auto-assigned on create, editable)
- `is_self` flag (marks this as the workspace owner's own entry)
- Status (active / inactive)

### 4.4 Team Role Management
- CRUD for team roles (e.g. Photographer, Decorator, Coordinator)
- Each role has: name, default rate, rate type (Per Event / Per Day / Fixed), status
- Used as default rates when assigning members to events

### 4.5 Availability Calendar
- Monthly calendar view per team member
- Shows booked dates (from event assignments) in member's color
- Shows blocked dates (leave/unavailability) in red
- Click date to see booking details popup

### 4.6 Block Date Dialog
- Mark a team member unavailable for a date range
- Reason (Leave, Sick, Travel, etc.)
- Prevents assignment to events on those dates

### 4.7 Team Color Auto-Assignment
- New members get a deterministic color based on name hash
- Colors are visually distinct (from a curated palette)
- Color shows as vertical accent bar on cards, calendar, and assignment items
- Editable via color picker in the form

### 4.8 Team Member Type Manager
- Manage member types (e.g. Bride Side, Groom Side, Common)
- Used in event assignments to categorize members
- Color-coded tags (toggle on/off in preferences)

---

## 5. Services & Providers

### 5.1 Service Catalog
- CRUD for services (e.g. Album, Drone Shoot, Catering)
- Each service: name, description, default rate, rate type (Fixed / Per Day / Per Unit)
- GST rate + SAC code per service
- Status (active / inactive)

### 5.2 Service Provider Management
- External vendors/suppliers (separate from internal team)
- Name, phone, email, notes, status
- Linked to services as optional provider

### 5.3 Service Form
- Name (required), description
- Default rate + rate type
- GST rate, SAC code
- Status toggle

---

## 6. Events / Projects

### 6.1 Event List
- Table view of all events
- Columns: title, client, dates, venue, status, contract value
- Filter by status (upcoming / in-progress / completed / cancelled)
- Group toggle: "This Week" vs "All" flat list
- Pro plan: show address + services columns
- Search by title, client, venue

### 6.2 Event Editor (Create/Edit)
- **Basic Info:** title, event type (from workspace config), client (required)
- **Dates:** start date, end date, non-consecutive event dates (multi-date picker)
- **Venue:** venue name, venue address
- **Financial:** contract value, financial year
- **Description & Notes**
- Auto-calculates financial year from start date

### 6.3 Event Details Page (Tabbed)
- **Overview Tab:** all event info, team, services, financial summary
- **Team Tab:** team assignments with role, rate, working dates, member type
- **Services Tab:** service assignments with provider, rate, add-on flag
- **Financials Tab:** contract value, received, pending, milestone tracking
- **Progress Tab:** date-wise progress tracking (planned / confirmed / done)
- **Job Sheet Tab:** link to job sheet for this event

### 6.4 Team Assignment (Assign Team Dialog)
- Select team member(s) to assign to event
- Choose role per assignment
- Set agreed rate (defaults from role, editable)
- Set rate type (Per Event / Per Day / Fixed)
- Select working dates (from event's date list)
- Set member type (Bride Side / Groom Side / Common)
- Booking start/end dates per member
- Conflict detection (warns if member is already booked or on leave)

### 6.5 Service Assignment (Assign Service Dialog)
- Select service(s) to assign to event
- Optional provider (team member who delivers the service)
- Agreed rate (defaults from service, editable)
- Rate type
- Add-on flag (last-minute service that adds to contract value)

### 6.6 Event Assignment Card
- Shows assigned member/service with role, rate, dates
- Color accent bar (member's color)
- Payment status (agreed vs paid vs pending)
- Actions: edit assignment, record payment, share, remove
- Expandable payment history per assignment
- Edit/delete individual transactions (for non-owner members)

### 6.7 Day Schedule Card
- Per-day breakdown of team + services for multi-day events
- Day status (planned / confirmed / done / cancelled)
- Venue override per day
- Day notes

### 6.8 Event Financial Cards
- Contract value, total received, balance due
- Milestone progress (if quotation linked)
- Quick action: record payment

### 6.9 Event Status Management
- Change status: upcoming → in-progress → completed → cancelled
- Status dot indicators (green/yellow/red based on preferences)
- Status change doesn't auto-update financials

### 6.10 Rate Estimator
- Standalone tool to estimate event cost
- Select team members + services + days
- Auto-calculates estimated total based on role/service rates
- Does NOT create an event or quotation — just an estimate

### 6.11 Event Type Autocomplete
- Event type field auto-suggests from workspace's configured event types
- Allows custom entry if type not in list

### 6.12 Reminder Banner
- Shows on event details if event is within 48 hours
- Quick action to set up reminder

### 6.13 Upgrade Banner
- Shows on events page if user is on free plan and hits a limit
- Prompts upgrade to Pro

---

## 7. Quotation Engine

### 7.1 Quotation List
- All quotations with status (draft / finalized / accepted / rejected / expired / cancelled)
- Filter by status, client, category
- Quick actions: view, duplicate, delete
- Shows quotation number, client, date, grand total

### 7.2 Quotation Editor
- **Client & Event Selection:** link to existing client/event or standalone
- **Category & Context:** PHOTOGRAPHY / EVENT_MANAGEMENT / ARCHITECTURE / OTHER + context type (bride_side, groom_side, common, residential, commercial)
- **Date Engine:** start/end dates, excluded dates, non-consecutive date support
- **Day Builder:** group items by day/phase (e.g. Haldi, Sangeet, Wedding Day)
- **Items Editor:** add services, roles, team members, or custom items
  - Each item: name, description, quantity, days, unit rate, rate type, line total
  - Member type per item (bride/groom/common)
  - Phase title per item
  - Add-on flag
  - GST rate + SAC code per item
  - Sort order (drag to reorder)
- **Pricing Panel:** subtotal, discount (% or fixed), taxable amount, GST (CGST+SGST or IGST), grand total
- **Presentation:** project title, project summary, terms & conditions, special notes, footer message
- **Milestones Editor:** payment schedule (percent or fixed milestones)
- **Template Settings:** choose PDF template, custom config
- **Public Link Panel:** enable/disable public portal link, copy URL, view tracking

### 7.3 Quotation Finalization
- Validates all required fields
- Freezes snapshots: client, business, event, bank details, social links
- Locks item pricing (immutable after finalization)
- Status: draft → finalized
- Generates quotation number if not set

### 7.4 Quotation Acceptance (Client-side)
- Client views quotation via public URL
- Can sign online (signature pad)
- Optional password gate
- On acceptance: status → accepted, sync_pending = true
- Triggers sync to Event + FinancialYear + Milestones

### 7.5 Quotation Sync (Accepted → Event)
- Creates/updates Event from quotation data
- Creates EventTeamAssignment records from team items
- Creates EventServiceAssignment records from service items
- Creates PaymentMilestone records from payment schedule
- Sets Event.contract_value = quotation.grand_total
- Marks sync_completed_at

### 7.6 Create Invoice from Quotation
- Dialog to create invoice from accepted quotation
- Option 1: Full invoice (single invoice for entire amount)
- Option 2: Milestone-based invoice (one invoice per milestone)
- Copies items, snapshots, and pricing to invoice

### 7.7 Quotation Duplication
- Creates a copy of the quotation with all items
- New quotation number, status = draft
- Does NOT copy client signature or acceptance

### 7.8 PDF Generation
- Multiple templates (Gold Premium, Navy Gold)
- Custom template config (colors, fonts, layout)
- Download PDF or preview in modal
- Print-ready format

### 7.9 Quotation Packages
- Save reusable quotation structures as templates
- Package contains: days, team, services, custom items, terms
- Apply package to new quotation (pre-fills items)
- Category-specific packages

### 7.10 Show/Hide Pricing
- Toggle: show quantity, rate, amount to client
- When off: client sees only item names and grand total

### 7.11 Hide Team Names
- Toggle: show only roles (not member names) on public portal
- For privacy when sharing with clients

---

## 8. Invoice & Payments

### 8.1 Invoice List
- All invoices with status (draft / due / sent / paid / partial / overdue / cancelled)
- Filter by status, client
- Quick actions: view, edit, duplicate, delete
- Shows invoice number, client, date, grand total, amount paid, balance

### 8.2 Invoice Editor
- **Client & Event Selection**
- **Invoice Type:** full / milestone / manual
- **Milestone Link:** if milestone type, link to specific PaymentMilestone
- **Milestone Tag:** Advance / Event Day / Final Handover / Full Payment / Custom
- **Items:** line items with name, description, deliverables, quantity, unit rate, line total
  - Package items (with nested events) or line items
- **Pricing:** subtotal, discount, GST, grand total
- **Due Date:** due on receipt / net 15 / net 30 / custom
- **Bank Details:** saved as immutable snapshot at creation
- **Social Links:** saved as immutable snapshot
- **Authorized Signatory**
- **Payment Terms** (client-visible)
- **Terms & Conditions** (client-visible)
- **Internal Notes** (never shown to client)
- **Show Itemized Rates toggle** (show/hide rates on PDF & public link)

### 8.3 Invoice Duplication
- "Copy Invoice" button in list
- Creates copy with new invoice number, status = draft
- Copies items, pricing, snapshots

### 8.4 Record Invoice Payment
- Dialog to record payment against an invoice
- Amount, payment method, transaction date, reference number
- Creates FinancialTransaction (CLIENT_RECEIPT) linked to invoice
- Updates Invoice.amount_paid and balance_due
- Updates linked PaymentMilestone if applicable

### 8.5 Invoice Public Link
- Generate secure random token for public URL
- Toggle enable/disable (admin master control)
- View tracking (count, first viewed, latest viewed)
- Public page shows invoice with UPI QR code, bank details, social links

### 8.6 Invoice PDF
- Download invoice as PDF
- Print invoice
- Template-based rendering (Gold Premium)

### 8.7 UPI QR Code (Public Invoice)
- Generates UPI QR code from payment URI scheme (upi://pay?...)
- Uses business UPI ID from snapshot
- Client can scan to pay

### 8.8 Amount in Words
- Auto-generates total amount in words (e.g. "One Lakh Twenty Three Thousand Rupees Only")
- Shown on PDF and public invoice

---

## 9. Financial Management

### 9.1 Financial Year Management
- Create financial years (India: April 1 – March 31)
- Set active FY (workspace default)
- Close FY (status: open → closed)
- Each FY shows: label, start/end dates, status, received total, paid total, profit
- Active FY highlighted with green border
- Closed/Upcoming/Active status badges

### 9.2 Financial Transactions
- **Client Receipt (CLIENT_RECEIPT):** money IN from client
  - Linked to client, event, milestone, invoice
- **Team Payment (TEAM_PAYMENT):** money OUT to team member
  - Linked to team member, event, team assignment
- **Business Expense (BUSINESS_EXPENSE):** money OUT for expenses
  - Linked to expense category
- All transactions coupled to FinancialYear by transaction date
- Payment method: Cash / UPI / Bank Transfer / Card / Cheque / Other
- Reference number (UTR, cheque no.)
- Status: ACTIVE / VOID (void = soft delete, kept for audit)

### 9.3 Record Payment Dialog
- Amount, payment method, transaction date
- Reference number, notes
- Auto-links to event, client, milestone, invoice based on context

### 9.4 Record Expense Dialog
- Amount, expense category, payment method, date
- Notes

### 9.5 Payment Table
- List of all transactions (filtered by FY or event)
- Layout: particular + client name on left, method + colored amount on right
- Color-coded amounts: green (+) for receipts, red (−) for payments/expenses
- Void transactions shown at 50% opacity
- Edit individual transactions (non-sensitive fields only)
- Delete transactions (with audit trail)

### 9.6 Edit Transaction Dialog
- Edit amount, payment method, date, reference, notes
- Cannot edit transaction type or linked entities (audit integrity)
- Validates financial year availability

### 9.7 Expense Categories
- CRUD for expense categories (e.g. Travel, Equipment, Marketing)
- Used when recording business expenses

### 9.8 Financial Summary Cards
- Per FY: total received, total paid, profit
- Visual cards with trend indicators

### 9.9 Outstanding Receivables
- List of clients with outstanding balances
- Sorted by highest outstanding
- Quick action to record payment

### 9.10 Consolidated View
- All transactions across all FYs in one view
- Filter by type, date range, client, team member

---

## 10. Job Sheets

### 10.1 Job Sheet Creation
- Linked to an event (one job sheet per event)
- Settings: show team names vs roles only
- Include crew contact directory toggle
- Include equipment checklist toggle
- Equipment list (JSON array of items)
- Deliverables checklist (JSON array)
- Per-date config: reporting time, phase title, venue override
- Internal execution notes

### 10.2 Job Sheet Document
- Printable crew-facing document
- Shows: event details, dates, team assignments (role/name), services, equipment, deliverables
- Per-day breakdown with reporting times
- Crew contact directory (if enabled)

### 10.3 Public Job Sheet Link
- Secure token-based URL for crew access
- Toggle enable/disable
- View tracking
- Crew can view on mobile without login

### 10.4 Job Sheet PDF
- Download as PDF
- Print-ready format

---

## 11. Client Portal (Authenticated)

### 11.1 Client Login
- Email + password authentication (separate from admin login)
- Only users with role = 'client' can access
- Auto-links to Client record on first login (by matching email)
- Redirects to client portal dashboard

### 11.2 Client Portal Dashboard
- **Projects:** all events for this client with status, dates, progress
- **Quotations:** all quotations shared with this client
  - View quotation details, milestones, terms
  - Accept/reject quotation (online signing)
  - Download quotation PDF
- **Invoices:** all invoices for this client
  - View invoice details, payment status
  - Download invoice PDF
  - Pay via UPI QR code
- **Payment History:** all CLIENT_RECEIPT transactions
- **Financial Progress Bar:** total contracted vs paid vs outstanding
- **Consolidated Documents:** all quotations + invoices in one place

### 11.3 Client Route Guard
- Only client-role users can access /client-portal
- Non-client users redirected to admin login

### 11.4 Auto-Link Logic
- On first portal login, if user's email matches a Client record email
- Sets User.linked_client_id and User.linked_workspace_id
- Subsequent logins go straight to dashboard

---

## 12. Public Portals (Token-based)

### 12.1 Public Quotation View (/q/:token)
- No login required — token-based access
- Shows quotation details, items, pricing (if show_pricing enabled)
- Payment milestones
- Terms & conditions, special notes
- Online signing (signature pad)
- Optional password gate
- Accept/reject quotation
- Download PDF
- View tracking (count, first/latest viewed)

### 12.2 Public Client Project Portal (/portal/:token)
- No login required — token-based access
- Project timeline (event dates with status)
- Financial milestones with payment progress
- Service summary
- Team summary (names hidden if hide_team_names enabled)
- Document downloads (quotation, invoice PDFs via secure tokens)

### 12.3 Public Invoice (/invoice/:token)
- No login required — token-based access
- Full invoice display
- UPI QR code for payment
- Bank details, social links (from snapshot)
- Payment history
- Download PDF / Print
- View tracking

### 12.4 Public Job Sheet (/job-sheet/:token)
- No login required — token-based access
- Crew-facing job sheet
- Per-day schedule, team, services, equipment
- Print-friendly

### 12.5 Public Event Tracking (/track/:id)
- No login required — event ID-based
- Shows event progress timeline
- Date-wise status updates

### 12.6 Portal Token Management
- QuotationPortal and JobSheetPortal entities manage tokens
- Master enable/disable switch
- View count and timestamps
- Workspace + admin access control

---

## 13. Preferences & Settings

### 13.1 Profile Section
- Edit full name, email
- Change password
- View account info

### 13.2 Workspace Settings
- Edit business name, type, category
- Edit contact details (email, phone, address)
- Edit GST details (GSTIN, registered name, billing address, default rate)
- Custom work labels (singular/plural)
- Currency, timezone

### 13.3 Appearance Section
- Dark mode toggle
- Language selector (English / Hindi / Gujarati)
- Status dot visibility (global toggle to hide ALL status dots)
- Show/hide text labels under mobile nav icons

### 13.4 Display Preferences
- **Status dots:** Green (Completed), Yellow (Pending/Upcoming/In-Progress), Red (Cancelled)
- **Member type color-coding:** toggle on/off
- **Show team on events:** toggle
- **Show services on events:** toggle
- **Group upcoming events:** "This Week" vs "All" toggle
- **Show address on cards:** Pro plan only
- **Show services on cards:** Pro plan only

### 13.5 Event Type Manager
- Add/remove/edit event types (custom to workspace)
- Used in event editor autocomplete

### 13.6 Team Member Type Manager
- Add/remove/edit member types (Bride Side, Groom Side, etc.)
- Color assignment per type

### 13.7 Notifications Section
- Email notification preferences
- Push notification toggle (pending VAPID/FCM config)

### 13.8 Session Section
- Active sessions list
- Logout from all devices

### 13.9 Billing Section
- Current plan, status, expiry
- Upgrade to Pro
- Payment history (subscription payments)
- Download invoices

---

## 14. SaaS / Subscription System

### 14.1 Plan Management (Admin)
- Create/edit plans (Free, Pro, etc.)
- Set plan limits (max events, max team members, max services, storage, PDF export, reminders)
- Set pricing per billing cycle (Monthly, Six Months, Annual)
- Activate/deactivate plans

### 14.2 Workspace Subscription
- Auto-created on workspace creation (Free plan)
- Track status: ACTIVE / EXPIRED / CANCELLED / SUSPENDED
- Start date, expiry date, auto-renew
- Source: ADMIN / PAYMENT_GATEWAY / PROMOTIONAL / ONBOARDING
- Assigned price snapshot

### 14.3 Subscription Payments
- Record of all payment attempts
- Gateway: Stripe / Razorpay
- Status: CREATED / SUCCESS / FAILED / REFUNDED
- Gateway order ID, payment ID
- Verification timestamp

### 14.4 Upgrade Flow
- User requests upgrade from Billing section
- UpgradeRequest created (status: PENDING)
- Admin reviews → APPROVED / REJECTED
- On approval: WorkspaceSubscription updated, plan_type changed

### 14.5 Payment Gateway Integration
- **Stripe:** checkout session creation, webhook handling
- **Razorpay:** order creation, payment verification, webhook handling
- Auto-activates Pro on successful payment

### 14.6 Plan Limit Enforcement
- Free plan limits: max events, max team members, max services
- Pro plan: unlimited (or higher limits)
- Storage limits tracked via StorageUsage entity
- PDF export: Pro only
- Reminders: Pro only

### 14.7 Downgrade Flow
- Admin can downgrade workspace to Free
- Updates WorkspaceSubscription status
- Updates Workspace.plan_type

### 14.8 Storage Usage Tracking
- Tracks total bytes + file count per workspace
- Compared against plan limit
- Blocks uploads when limit reached

---

## 15. Admin Panel

### 15.1 Admin Dashboard
- Total workspaces count
- Active subscriptions count
- Revenue stats (subscription payments)
- Recent signups
- Recent support tickets

### 15.2 Workspace Management
- List all workspaces with owner, plan, status, created date
- Filter by plan, status
- View workspace details (entities, counts, subscription)
- Suspend / activate workspace
- Change workspace plan
- View storage usage

### 15.3 Plan Management
- CRUD for plans, limits, pricing
- Activate/deactivate plans
- Sort order for display

### 15.4 Admin Route Guard
- Only users with role = 'admin' can access /admin/*
- Separate layout from workspace app

---

## 16. Support & Help

### 16.1 Help & Support Page
- Single destination for all help needs
- Feature guides (how-to for each module)
- FAQ section
- Contact / support ticket form

### 16.2 Support Ticket System
- User submits ticket (subject, message, category, priority)
- Categories: bug, feature_request, billing, account, general
- Priority: low, medium, high, urgent
- Status: open → in_progress → resolved → closed
- Admin can respond and update status
- User sees their ticket history

### 16.3 Feature Guides
- In-app walkthroughs for key features
- Step-by-step instructions
- Visual examples

### 16.4 FAQ Page
- Common questions and answers
- Categorized

### 16.5 App Updates Page
- Changelog of recent updates
- Version history

---

## 17. PWA & Offline

### 17.1 Installable PWA
- Add to home screen (iOS/Android)
- Standalone display mode
- App icon, splash screen
- Manifest.json configured

### 17.2 Service Worker
- Caches static assets for offline use
- Offline fallback page
- Update banner when new version available

### 17.3 Offline Banner
- Shows when network is disconnected
- Auto-hides when back online

### 17.4 Install Prompt
- Shows custom install banner (before browser prompt)
- Dismissible

### 17.5 Mobile Navigation
- Bottom navigation bar (mobile)
- Toggle to show/hide text labels under icons
- Consistent icon size when labels hidden
- Safe area insets for notch devices

### 17.6 Mobile Input Zoom Prevention
- Forces 16px font on inputs (mobile) to prevent iOS auto-zoom

---

## 18. Notifications

### 18.1 In-App Notifications
- Notification bell in header
- Unread count badge
- Types: event_reminder, payment_due, subscription_expiring, subscription_expired, team_conflict, general
- Mark as read / mark all as read
- Click to navigate to related entity

### 18.2 Email Notifications
- Sent via SendEmail integration
- Event reminders
- Payment due reminders
- Subscription expiry warnings

### 18.3 Push Notifications (Pending)
- Mobile push via SendPushNotification
- Requires VAPID/FCM configuration
- Not yet active

### 18.4 Notification Generation
- Backend function generates notifications based on:
  - Upcoming events (24h / 48h before)
  - Overdue invoices
  - Subscription expiry (30/7/1 days before)
  - Team scheduling conflicts

---

## 19. AI Agent

### 19.1 In-App Agent Bot
- Floating action button (bottom right)
- Chat interface for in-app assistance
- Can answer questions about the app
- Can perform actions via backend functions
- Context-aware (knows current workspace)

### 19.2 Agent Chat Backend
- Processes user messages
- Uses InvokeLLM for natural language understanding
- Can call backend functions as tools
- Entity access for data queries

---

## 20. Landing Page

### 20.1 Hero Section
- Value proposition headline
- CTA buttons (Get Started, Learn More)
- Product preview visual

### 20.2 Features Section
- Key feature highlights
- Icons + descriptions

### 20.3 Industry Section
- Photography, Event Management, Architecture, Other
- Industry-specific value props

### 20.4 How It Works
- Step-by-step flow (Sign up → Onboard → Create → Manage)

### 20.5 Problem/Solution
- Pain points addressed

### 20.6 Trust Section
- Testimonials / social proof

### 20.7 Pricing Preview
- Free vs Pro comparison
- Feature matrix

### 20.8 Product Proof
- Dashboard, Financial, Team, Quotation previews

### 20.9 FAQ (Landing)
- Common pre-signup questions

### 20.10 CTA Section
- Final call to action
- Sign up redirect

### 20.11 Landing Footer
- Links to About, FAQ, Terms, Privacy
- Social links

### 20.12 Landing Navigation
- Top nav with login/register buttons
- Smooth scroll to sections

---

## Legal Pages

### Terms of Service
- Full TOS document at /terms

### Privacy Policy
- Full privacy policy at /privacy

### About Page
- Company story, values, who it's for, CTA

---

## Global Features

### Multi-Industry Support
- Centralized terminology system (custom work labels)
- Category-aware onboarding
- Workspace-configurable event types
- Industry-specific quotation contexts

### Multi-Language
- English, Hindi, Gujarati
- Language switcher in preferences
- RTL support ready (for Arabic/Hebrew if needed)

### Multi-Currency
- Workspace-level currency setting
- Default: INR
- Used in all financial displays

### Multi-Timezone
- Workspace-level timezone
- Default: Asia/Kolkata
- Used for date/time calculations

### Dark Mode
- Full dark theme support
- Toggle in appearance settings
- Respects system preference

### Responsive Design
- Mobile-first design
- Tablet + desktop layouts
- Touch-optimized controls

### Realtime Updates
- Entity subscriptions (live updates without refresh)
- Used in events list, notifications, financial transactions

### Global Search
- Search across clients, events, quotations, invoices
- Quick access from header

### Workspace Switcher
- Users with multiple workspaces can switch
- Dropdown in header

### Back Guard (Mobile)
- Confirms before leaving app (prevents accidental exit)

### Scroll to Top
- Auto-scrolls to top on route change

### Error Boundary
- Catches rendering errors
- Shows fallback UI instead of white screen

### Page Not Found
- 404 page for unknown routes

---

*Update this document whenever a new feature is added or an existing one changes. Keep the "Last Updated" date current.*