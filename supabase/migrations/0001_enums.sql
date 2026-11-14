-- ============================================================
-- 0001 — PostgreSQL Enums (all status/ type fields)
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'user', 'client', 'team_member');

-- Languages
CREATE TYPE app_language AS ENUM ('en', 'hi', 'gu');

-- Workspace
CREATE TYPE business_category AS ENUM ('PHOTOGRAPHY', 'EVENT_MANAGEMENT', 'ARCHITECTURE', 'INTERIOR', 'SALON_BEAUTY', 'CONSULTING', 'AGENCY', 'CATERING', 'CONTRACTING', 'OTHER');
CREATE TYPE plan_type AS ENUM ('free', 'pro');
CREATE TYPE plan_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE date_format AS ENUM ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD');
CREATE TYPE number_format AS ENUM ('indian', 'western');

-- WorkspaceMember
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'accountant', 'manager', 'staff');
CREATE TYPE workspace_member_status AS ENUM ('active', 'invited', 'removed');

-- Client portal
-- (portal_access_enabled is boolean, no enum needed)

-- Lead
CREATE TYPE lead_source AS ENUM ('referral', 'social_media', 'website', 'walk_in', 'advertisement', 'other');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost');
CREATE TYPE lead_priority AS ENUM ('hot', 'warm', 'cold');

-- Event
CREATE TYPE event_status AS ENUM ('upcoming', 'in-progress', 'completed', 'postponed', 'cancelled');

-- TeamMember / TeamRole / Service
CREATE TYPE rate_type_event AS ENUM ('Per Event', 'Per Day', 'Fixed');
CREATE TYPE rate_type_service AS ENUM ('Fixed', 'Per Day', 'Per Unit');
CREATE TYPE active_inactive AS ENUM ('active', 'inactive');

-- EventTeamAssignment
CREATE TYPE assignment_status AS ENUM ('assigned', 'removed');

-- EventServiceAssignment
CREATE TYPE service_rate_type AS ENUM ('Fixed', 'Per Day', 'Per Unit');

-- EventDayAssignment
CREATE TYPE day_status AS ENUM ('planned', 'confirmed', 'done', 'cancelled');

-- TeamBlockDate
CREATE TYPE block_status AS ENUM ('active', 'cancelled');

-- EventReminder
CREATE TYPE reminder_type AS ENUM ('24_hours', '48_hours', 'custom');
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'cancelled');

-- Quotation
CREATE TYPE quotation_status AS ENUM ('draft', 'finalized', 'accepted', 'rejected', 'expired', 'cancelled');
CREATE TYPE quotation_category AS ENUM ('PHOTOGRAPHY', 'EVENT_MANAGEMENT', 'ARCHITECTURE', 'OTHER');
CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
CREATE TYPE gst_mode AS ENUM ('cgst_sgst', 'igst');

-- QuotationItem
CREATE TYPE quotation_item_type AS ENUM ('service', 'role', 'team', 'custom');
CREATE TYPE quotation_item_rate_type AS ENUM ('Fixed', 'Per Day', 'Per Unit', 'Per Event');

-- Invoice
CREATE TYPE invoice_status AS ENUM ('draft', 'due', 'sent', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE due_date_type AS ENUM ('due_on_receipt', 'net_15', 'net_30', 'custom');
CREATE TYPE invoice_type AS ENUM ('full', 'milestone', 'manual');
CREATE TYPE milestone_tag AS ENUM ('Advance', 'Event Day', 'Final Handover', 'Full Payment', 'Custom');
CREATE TYPE signature_type AS ENUM ('none', 'text', 'esign');

-- InvoiceItem
CREATE TYPE invoice_item_type AS ENUM ('package', 'line_item');

-- PaymentMilestone
CREATE TYPE milestone_type AS ENUM ('percent', 'fixed');
CREATE TYPE milestone_status AS ENUM ('upcoming', 'due', 'partially_paid', 'paid', 'overdue');

-- FinancialTransaction
CREATE TYPE transaction_type AS ENUM ('CLIENT_RECEIPT', 'TEAM_PAYMENT', 'BUSINESS_EXPENSE');
CREATE TYPE payment_method AS ENUM ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other');
CREATE TYPE transaction_status AS ENUM ('ACTIVE', 'VOID');

-- FinancialYear
CREATE TYPE fy_status AS ENUM ('open', 'closed');

-- JobSheet
CREATE TYPE jobsheet_status AS ENUM ('active', 'archived');

-- Notification
CREATE TYPE notification_type AS ENUM ('event_reminder', 'payment_due', 'subscription_expiring', 'subscription_expired', 'team_conflict', 'general');

-- SupportTicket
CREATE TYPE support_category AS ENUM ('bug', 'feature_request', 'billing', 'account', 'general');
CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- SaaS Plans
CREATE TYPE billing_cycle AS ENUM ('MONTHLY', 'SIX_MONTHS', 'ANNUAL');
CREATE TYPE plan_limit_key AS ENUM ('max_events', 'max_team_members', 'max_services', 'max_storage_gb', 'pdf_export_enabled', 'reminders_enabled');

-- WorkspaceSubscription
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE subscription_source AS ENUM ('ADMIN', 'PAYMENT_GATEWAY', 'PROMOTIONAL', 'ONBOARDING');

-- SubscriptionPayment
CREATE TYPE payment_gateway_status AS ENUM ('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED');

-- UpgradeRequest
CREATE TYPE upgrade_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- PushSubscription
CREATE TYPE push_platform AS ENUM ('web', 'android', 'ios');