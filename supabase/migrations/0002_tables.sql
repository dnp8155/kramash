-- ============================================================
-- 0002 — All PostgreSQL Tables (37 tables)
-- Run AFTER 0001_enums.sql
-- ============================================================

-- ============================================================
-- 1. profiles (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  phone TEXT,
  language app_language DEFAULT 'en',
  linked_client_id UUID,
  linked_team_member_id UUID,
  linked_workspace_id UUID,
  app_lock_enabled BOOLEAN DEFAULT false,
  app_lock_relock_after INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. workspaces
-- ============================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT,
  business_category business_category DEFAULT 'OTHER',
  custom_business_type TEXT,
  custom_work_label_singular TEXT,
  custom_work_label_plural TEXT,
  tagline TEXT,
  website TEXT,
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  logo TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  date_format date_format DEFAULT 'DD/MM/YYYY',
  number_format number_format DEFAULT 'indian',
  fy_start_month INTEGER DEFAULT 4,
  plan_type plan_type DEFAULT 'free',
  plan_status plan_status DEFAULT 'active',
  gst_enabled BOOLEAN DEFAULT false,
  gstin TEXT,
  gst_business_name TEXT,
  gst_billing_address TEXT,
  gst_state TEXT,
  default_gst_rate NUMERIC DEFAULT 18,
  team_member_types JSONB DEFAULT '[]'::jsonb,
  event_types JSONB DEFAULT '[]'::jsonb,
  display_preferences JSONB DEFAULT '{}'::jsonb,
  public_profile_enabled BOOLEAN DEFAULT false,
  public_profile_slug TEXT,
  public_profile_about TEXT,
  public_profile_social_links JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 3. workspace_members
-- ============================================================
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role workspace_member_role DEFAULT 'owner',
  status workspace_member_status DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 4. clients
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  notes TEXT,
  portal_access_token TEXT,
  portal_password_hash TEXT,
  portal_access_enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 5. leads
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source lead_source DEFAULT 'other',
  event_type TEXT,
  event_date DATE,
  event_end_date DATE,
  event_dates DATE[],
  budget NUMERIC DEFAULT 0,
  status lead_status DEFAULT 'new',
  priority lead_priority DEFAULT 'warm',
  next_followup_date DATE,
  notes TEXT,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  converted_event_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 6. events
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  event_dates DATE[] DEFAULT '{}',
  financial_year TEXT,
  team_member_ids UUID[] DEFAULT '{}',
  service_ids UUID[] DEFAULT '{}',
  venue TEXT,
  venue_address TEXT,
  status event_status DEFAULT 'upcoming',
  contract_value NUMERIC DEFAULT 0,
  misc_expenses_json JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  notes TEXT,
  public_token TEXT,
  public_tracking_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 7. team_members
-- ============================================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role_id UUID,
  profession TEXT,
  is_self BOOLEAN DEFAULT false,
  member_type_id TEXT,
  color TEXT DEFAULT '#0d9488',
  default_rate NUMERIC DEFAULT 0,
  rate_type rate_type_event DEFAULT 'Per Event',
  notes TEXT,
  status active_inactive DEFAULT 'active',
  portal_access_token TEXT,
  portal_password_hash TEXT,
  portal_access_enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 8. team_roles
-- ============================================================
CREATE TABLE team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_rate NUMERIC DEFAULT 0,
  rate_type rate_type_event DEFAULT 'Per Event',
  status active_inactive DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 9. services
-- ============================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_rate NUMERIC DEFAULT 0,
  rate_type rate_type_service DEFAULT 'Fixed',
  gst_rate NUMERIC DEFAULT 0,
  sac_code TEXT,
  status active_inactive DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 10. service_providers
-- ============================================================
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status active_inactive DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 11. event_team_assignments
-- ============================================================
CREATE TABLE event_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role_id UUID,
  role_name_snapshot TEXT,
  member_type_id TEXT,
  member_type_snapshot TEXT,
  agreed_rate NUMERIC DEFAULT 0,
  rate_type rate_type_event DEFAULT 'Per Event',
  working_dates DATE[] DEFAULT '{}',
  booking_start_date DATE,
  booking_end_date DATE,
  assignment_status assignment_status DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 12. event_service_assignments
-- ============================================================
CREATE TABLE event_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_name_snapshot TEXT,
  provider_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  provider_name_snapshot TEXT,
  agreed_rate NUMERIC DEFAULT 0,
  rate_type service_rate_type DEFAULT 'Fixed',
  is_addon BOOLEAN DEFAULT false,
  assignment_status assignment_status DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 13. event_day_assignments
-- ============================================================
CREATE TABLE event_day_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  team_member_ids UUID[] DEFAULT '{}',
  service_ids UUID[] DEFAULT '{}',
  venue_override TEXT,
  notes TEXT,
  status day_status DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 14. team_block_dates
-- ============================================================
CREATE TABLE team_block_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT DEFAULT 'Leave',
  status block_status DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 15. event_reminders
-- ============================================================
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reminder_type reminder_type DEFAULT '24_hours',
  custom_hours NUMERIC DEFAULT 0,
  scheduled_for TIMESTAMPTZ,
  status reminder_status DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 16. quotations
-- ============================================================
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quotation_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  quotation_date DATE NOT NULL,
  valid_until DATE,
  status quotation_status DEFAULT 'draft',
  category quotation_category DEFAULT 'PHOTOGRAPHY',
  context_type TEXT,
  start_date DATE,
  end_date DATE,
  excluded_dates DATE[] DEFAULT '{}',
  show_pricing BOOLEAN DEFAULT true,
  template_id TEXT DEFAULT 'black_premium',
  template_config JSONB,
  project_title TEXT,
  project_summary TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount_type discount_type DEFAULT 'percent',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_applicable BOOLEAN DEFAULT false,
  gst_mode gst_mode DEFAULT 'cgst_sgst',
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  gst_total NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  payment_schedule_json JSONB,
  terms_and_conditions TEXT,
  special_notes TEXT,
  payment_conditions TEXT,
  notes TEXT,
  bank_details_snapshot JSONB,
  social_links_snapshot JSONB,
  footer_message TEXT,
  client_snapshot JSONB,
  business_snapshot JSONB,
  event_snapshot JSONB,
  client_signature TEXT,
  signed_by_name TEXT,
  signed_at TIMESTAMPTZ,
  client_access_password TEXT,
  public_token TEXT,
  public_link_enabled BOOLEAN DEFAULT false,
  hide_team_names BOOLEAN DEFAULT false,
  portal_first_viewed_at TIMESTAMPTZ,
  portal_latest_viewed_at TIMESTAMPTZ,
  portal_view_count INTEGER DEFAULT 0,
  sync_pending BOOLEAN DEFAULT false,
  sync_completed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 17. quotation_items
-- ============================================================
CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_type quotation_item_type DEFAULT 'custom',
  reference_id TEXT,
  team_member_id UUID,
  team_member_name_snapshot TEXT,
  member_type TEXT,
  day_date DATE,
  phase_title TEXT,
  is_addon BOOLEAN DEFAULT false,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  days NUMERIC DEFAULT 1,
  unit_rate NUMERIC DEFAULT 0,
  rate_type quotation_item_rate_type DEFAULT 'Fixed',
  line_total NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 0,
  sac_code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 18. quotation_packages
-- ============================================================
CREATE TABLE quotation_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category quotation_category DEFAULT 'PHOTOGRAPHY',
  structure_json JSONB,
  terms_and_conditions TEXT,
  footer_message TEXT,
  status active_inactive DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 19. quotation_portals
-- ============================================================
CREATE TABLE quotation_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 20. payment_milestones
-- ============================================================
CREATE TABLE payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  milestone_type milestone_type DEFAULT 'percent',
  milestone_value NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_condition TEXT,
  due_date DATE,
  status milestone_status DEFAULT 'upcoming',
  financial_year_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 21. invoices
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  due_date_type due_date_type DEFAULT 'due_on_receipt',
  invoice_type invoice_type DEFAULT 'manual',
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,
  milestone_tag milestone_tag DEFAULT 'Full Payment',
  status invoice_status DEFAULT 'draft',
  show_itemized_rates BOOLEAN DEFAULT true,
  subtotal NUMERIC DEFAULT 0,
  discount_type discount_type DEFAULT 'percent',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_applicable BOOLEAN DEFAULT false,
  gst_rate NUMERIC DEFAULT 0,
  gst_mode gst_mode DEFAULT 'cgst_sgst',
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  gst_total NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  amount_in_words TEXT,
  payment_schedule_json JSONB,
  client_snapshot JSONB,
  business_snapshot JSONB,
  event_snapshot JSONB,
  bank_details_snapshot JSONB,
  social_links_snapshot JSONB,
  authorized_signatory TEXT,
  signature_type signature_type DEFAULT 'none',
  signature_image TEXT,
  signature_color TEXT DEFAULT '#000000',
  notes TEXT,
  payment_terms TEXT,
  terms_and_conditions TEXT,
  public_token TEXT,
  public_link_enabled BOOLEAN DEFAULT false,
  portal_view_count INTEGER DEFAULT 0,
  portal_first_viewed_at TIMESTAMPTZ,
  portal_latest_viewed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 22. invoice_items
-- ============================================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type invoice_item_type DEFAULT 'line_item',
  name TEXT NOT NULL,
  description TEXT,
  deliverables TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_rate NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  events_json JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 23. financial_years
-- ============================================================
CREATE TABLE financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fy_id TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  status fy_status DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 24. financial_transactions
-- ============================================================
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  financial_year_id UUID REFERENCES financial_years(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  transaction_type transaction_type NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  team_assignment_id UUID REFERENCES event_team_assignments(id) ON DELETE SET NULL,
  service_assignment_id UUID REFERENCES event_service_assignments(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_category_id UUID,
  expense_category_name_snapshot TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method payment_method DEFAULT 'Cash',
  transaction_date DATE NOT NULL,
  reference_number TEXT,
  notes TEXT,
  status transaction_status DEFAULT 'ACTIVE',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 25. expense_categories
-- ============================================================
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status active_inactive DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 26. job_sheets
-- ============================================================
CREATE TABLE job_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  show_team_names BOOLEAN DEFAULT false,
  include_crew_contacts BOOLEAN DEFAULT false,
  include_equipment BOOLEAN DEFAULT false,
  show_job_sheet BOOLEAN DEFAULT false,
  equipment_list JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  date_configs JSONB DEFAULT '{}'::jsonb,
  internal_notes TEXT,
  status jobsheet_status DEFAULT 'active',
  public_token TEXT,
  public_link_enabled BOOLEAN DEFAULT false,
  portal_view_count INTEGER DEFAULT 0,
  portal_first_viewed_at TIMESTAMPTZ,
  portal_latest_viewed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 27. job_sheet_portals
-- ============================================================
CREATE TABLE job_sheet_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 28. notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  read BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 29. support_tickets
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category support_category DEFAULT 'general',
  priority support_priority DEFAULT 'medium',
  status support_status DEFAULT 'open',
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 30. plans (SaaS — platform level)
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 31. plan_pricings
-- ============================================================
CREATE TABLE plan_pricings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  billing_cycle billing_cycle NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  duration_months INTEGER NOT NULL DEFAULT 1,
  storage_gb NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 32. plan_limits
-- ============================================================
CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  limit_key plan_limit_key NOT NULL,
  limit_value TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 33. workspace_subscriptions
-- ============================================================
CREATE TABLE workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  pricing_id UUID REFERENCES plan_pricings(id) ON DELETE SET NULL,
  status subscription_status DEFAULT 'ACTIVE',
  started_at DATE,
  expires_at DATE,
  auto_renew BOOLEAN DEFAULT false,
  source subscription_source DEFAULT 'ADMIN',
  assigned_price NUMERIC DEFAULT 0,
  billing_cycle_snapshot TEXT,
  updated_by UUID,
  note TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 34. subscription_payments
-- ============================================================
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES workspace_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  pricing_id UUID REFERENCES plan_pricings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  gateway TEXT DEFAULT 'stripe',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  billing_cycle_snapshot TEXT,
  status payment_gateway_status DEFAULT 'CREATED',
  verified_at TIMESTAMPTZ,
  failure_reason TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 35. upgrade_requests
-- ============================================================
CREATE TABLE upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_plan TEXT DEFAULT 'PRO',
  requested_pricing_id UUID REFERENCES plan_pricings(id) ON DELETE SET NULL,
  status upgrade_request_status DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  note TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 36. storage_usage
-- ============================================================
CREATE TABLE storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  total_bytes NUMERIC DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 37. user_auth_credentials (WebAuthn)
-- ============================================================
CREATE TABLE user_auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  device_label TEXT,
  transports JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 38. push_subscriptions
-- ============================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform push_platform NOT NULL,
  endpoint TEXT,
  push_token TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID
);

-- ============================================================
-- 39. audit_logs (new — proposed)
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);