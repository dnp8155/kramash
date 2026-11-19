-- ============================================================
-- 0003 — Row-Level Security (RLS) Policies
-- Run AFTER 0002_tables.sql
-- ============================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_day_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_block_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sheet_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_pricings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: check if user is platform admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Helper function: get user's workspace IDs
-- ============================================================
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(DISTINCT wid), '{}')
  FROM (
    SELECT id AS wid FROM workspaces WHERE owner_user_id = auth.uid()
    UNION
    SELECT workspace_id AS wid FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'
  ) ws;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 1. profiles — self read/update, admin read all
-- ============================================================
CREATE POLICY profiles_read_self ON profiles FOR SELECT
  USING (id = auth.uid() OR is_platform_admin());
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY profiles_insert_self ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 2. workspaces — owner only
-- ============================================================
CREATE POLICY workspaces_read_owner ON workspaces FOR SELECT
  USING (owner_user_id = auth.uid() OR is_platform_admin());
CREATE POLICY workspaces_insert_owner ON workspaces FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY workspaces_update_owner ON workspaces FOR UPDATE
  USING (owner_user_id = auth.uid());
CREATE POLICY workspaces_delete_owner ON workspaces FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================
-- 3. workspace_members — self or admin
-- ============================================================
CREATE POLICY wm_read ON workspace_members FOR SELECT
  USING (user_id = auth.uid() OR is_platform_admin());
CREATE POLICY wm_insert ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY wm_update ON workspace_members FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY wm_delete ON workspace_members FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 4-15. Workspace-scoped tables — owner/creator only
-- Pattern: created_by_id = auth.uid() OR workspace_id IN user_workspace_ids()
-- ============================================================

-- clients
CREATE POLICY clients_read ON clients FOR SELECT
  USING (created_by_id = auth.uid() OR workspace_id = ANY(user_workspace_ids()));
CREATE POLICY clients_insert ON clients FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY clients_update ON clients FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY clients_delete ON clients FOR DELETE
  USING (created_by_id = auth.uid());

-- leads
CREATE POLICY leads_read ON leads FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY leads_update ON leads FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY leads_delete ON leads FOR DELETE
  USING (created_by_id = auth.uid());

-- events
CREATE POLICY events_read ON events FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY events_update ON events FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY events_delete ON events FOR DELETE
  USING (created_by_id = auth.uid());

-- team_members
CREATE POLICY tm_read ON team_members FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY tm_insert ON team_members FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY tm_update ON team_members FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY tm_delete ON team_members FOR DELETE
  USING (created_by_id = auth.uid());

-- team_roles
CREATE POLICY tr_read ON team_roles FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY tr_insert ON team_roles FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY tr_update ON team_roles FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY tr_delete ON team_roles FOR DELETE
  USING (created_by_id = auth.uid());

-- services
CREATE POLICY svc_read ON services FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY svc_insert ON services FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY svc_update ON services FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY svc_delete ON services FOR DELETE
  USING (created_by_id = auth.uid());

-- service_providers
CREATE POLICY sp_read ON service_providers FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY sp_insert ON service_providers FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY sp_update ON service_providers FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY sp_delete ON service_providers FOR DELETE
  USING (created_by_id = auth.uid());

-- event_team_assignments
CREATE POLICY eta_read ON event_team_assignments FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY eta_insert ON event_team_assignments FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY eta_update ON event_team_assignments FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY eta_delete ON event_team_assignments FOR DELETE
  USING (created_by_id = auth.uid());

-- event_service_assignments
CREATE POLICY esa_read ON event_service_assignments FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY esa_insert ON event_service_assignments FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY esa_update ON event_service_assignments FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY esa_delete ON event_service_assignments FOR DELETE
  USING (created_by_id = auth.uid());

-- event_day_assignments
CREATE POLICY eda_read ON event_day_assignments FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY eda_insert ON event_day_assignments FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY eda_update ON event_day_assignments FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY eda_delete ON event_day_assignments FOR DELETE
  USING (created_by_id = auth.uid());

-- team_block_dates
CREATE POLICY tbd_read ON team_block_dates FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY tbd_insert ON team_block_dates FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY tbd_update ON team_block_dates FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY tbd_delete ON team_block_dates FOR DELETE
  USING (created_by_id = auth.uid());

-- event_reminders
CREATE POLICY er_read ON event_reminders FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY er_insert ON event_reminders FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY er_update ON event_reminders FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY er_delete ON event_reminders FOR DELETE
  USING (created_by_id = auth.uid());

-- quotations
CREATE POLICY quot_read ON quotations FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY quot_insert ON quotations FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY quot_update ON quotations FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY quot_delete ON quotations FOR DELETE
  USING (created_by_id = auth.uid());

-- quotation_items
CREATE POLICY qi_read ON quotation_items FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY qi_insert ON quotation_items FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY qi_update ON quotation_items FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY qi_delete ON quotation_items FOR DELETE
  USING (created_by_id = auth.uid());

-- quotation_packages
CREATE POLICY qp_read ON quotation_packages FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY qp_insert ON quotation_packages FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY qp_update ON quotation_packages FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY qp_delete ON quotation_packages FOR DELETE
  USING (created_by_id = auth.uid());

-- payment_milestones
CREATE POLICY pm_read ON payment_milestones FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY pm_insert ON payment_milestones FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY pm_update ON payment_milestones FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY pm_delete ON payment_milestones FOR DELETE
  USING (created_by_id = auth.uid());

-- invoices
CREATE POLICY inv_read ON invoices FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY inv_insert ON invoices FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY inv_update ON invoices FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY inv_delete ON invoices FOR DELETE
  USING (created_by_id = auth.uid());

-- invoice_items
CREATE POLICY ii_read ON invoice_items FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY ii_insert ON invoice_items FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY ii_update ON invoice_items FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY ii_delete ON invoice_items FOR DELETE
  USING (created_by_id = auth.uid());

-- financial_years
CREATE POLICY fy_read ON financial_years FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY fy_insert ON financial_years FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY fy_update ON financial_years FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY fy_delete ON financial_years FOR DELETE
  USING (created_by_id = auth.uid());

-- financial_transactions
CREATE POLICY ft_read ON financial_transactions FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY ft_insert ON financial_transactions FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY ft_update ON financial_transactions FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY ft_delete ON financial_transactions FOR DELETE
  USING (created_by_id = auth.uid());

-- expense_categories
CREATE POLICY ec_read ON expense_categories FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY ec_insert ON expense_categories FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY ec_update ON expense_categories FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY ec_delete ON expense_categories FOR DELETE
  USING (created_by_id = auth.uid());

-- job_sheets
CREATE POLICY js_read ON job_sheets FOR SELECT
  USING (created_by_id = auth.uid());
CREATE POLICY js_insert ON job_sheets FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY js_update ON job_sheets FOR UPDATE
  USING (created_by_id = auth.uid());
CREATE POLICY js_delete ON job_sheets FOR DELETE
  USING (created_by_id = auth.uid());

-- ============================================================
-- Portal tables — owner + admin
-- ============================================================

-- quotation_portals
CREATE POLICY qp_portal_read ON quotation_portals FOR SELECT
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY qp_portal_insert ON quotation_portals FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY qp_portal_update ON quotation_portals FOR UPDATE
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY qp_portal_delete ON quotation_portals FOR DELETE
  USING (created_by_id = auth.uid() OR is_platform_admin());

-- job_sheet_portals
CREATE POLICY jsp_read ON job_sheet_portals FOR SELECT
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY jsp_insert ON job_sheet_portals FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY jsp_update ON job_sheet_portals FOR UPDATE
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY jsp_delete ON job_sheet_portals FOR DELETE
  USING (created_by_id = auth.uid() OR is_platform_admin());

-- ============================================================
-- notifications — user reads own, admin creates
-- ============================================================
CREATE POLICY notif_read ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY notif_insert ON notifications FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY notif_update ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY notif_delete ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- support_tickets — user reads own, admin updates
-- ============================================================
CREATE POLICY st_read ON support_tickets FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY st_insert ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY st_update ON support_tickets FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY st_delete ON support_tickets FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- SaaS Plans — public read, admin write
-- ============================================================
CREATE POLICY plans_read ON plans FOR SELECT
  USING (true);
CREATE POLICY plans_insert ON plans FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY plans_update ON plans FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY plans_delete ON plans FOR DELETE
  USING (is_platform_admin());

-- plan_pricings
CREATE POLICY pp_read ON plan_pricings FOR SELECT
  USING (true);
CREATE POLICY pp_insert ON plan_pricings FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY pp_update ON plan_pricings FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY pp_delete ON plan_pricings FOR DELETE
  USING (is_platform_admin());

-- plan_limits
CREATE POLICY pl_read ON plan_limits FOR SELECT
  USING (true);
CREATE POLICY pl_insert ON plan_limits FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY pl_update ON plan_limits FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY pl_delete ON plan_limits FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- Subscriptions — owner + admin
-- ============================================================

-- workspace_subscriptions
CREATE POLICY ws_read ON workspace_subscriptions FOR SELECT
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY ws_insert ON workspace_subscriptions FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY ws_update ON workspace_subscriptions FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY ws_delete ON workspace_subscriptions FOR DELETE
  USING (is_platform_admin());

-- subscription_payments
CREATE POLICY spay_read ON subscription_payments FOR SELECT
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY spay_insert ON subscription_payments FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY spay_update ON subscription_payments FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY spay_delete ON subscription_payments FOR DELETE
  USING (is_platform_admin());

-- upgrade_requests
CREATE POLICY ur_read ON upgrade_requests FOR SELECT
  USING (created_by_id = auth.uid() OR is_platform_admin());
CREATE POLICY ur_insert ON upgrade_requests FOR INSERT
  WITH CHECK (created_by_id = auth.uid());
CREATE POLICY ur_update ON upgrade_requests FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY ur_delete ON upgrade_requests FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- storage_usage — admin only
-- ============================================================
CREATE POLICY su_read ON storage_usage FOR SELECT
  USING (is_platform_admin());
CREATE POLICY su_insert ON storage_usage FOR INSERT
  WITH CHECK (is_platform_admin());
CREATE POLICY su_update ON storage_usage FOR UPDATE
  USING (is_platform_admin());
CREATE POLICY su_delete ON storage_usage FOR DELETE
  USING (is_platform_admin());

-- ============================================================
-- user_auth_credentials — self only
-- ============================================================
CREATE POLICY uac_read ON user_auth_credentials FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY uac_insert ON user_auth_credentials FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY uac_update ON user_auth_credentials FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY uac_delete ON user_auth_credentials FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- push_subscriptions — self only
-- ============================================================
CREATE POLICY ps_read ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY ps_insert ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ps_update ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY ps_delete ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- audit_logs — admin only
-- ============================================================
CREATE POLICY al_read ON audit_logs FOR SELECT
  USING (is_platform_admin());
CREATE POLICY al_insert ON audit_logs FOR INSERT
  WITH CHECK (true); -- triggers insert, allow all