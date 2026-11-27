-- ============================================================
-- 0004 — Triggers & Indexes
-- Run AFTER 0003_rls.sql
-- ============================================================

-- ============================================================
-- TRIGGER: Auto-create profile on auth.users INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at on all tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER team_roles_updated_at BEFORE UPDATE ON team_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER service_providers_updated_at BEFORE UPDATE ON service_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_team_assignments_updated_at BEFORE UPDATE ON event_team_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_service_assignments_updated_at BEFORE UPDATE ON event_service_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_day_assignments_updated_at BEFORE UPDATE ON event_day_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER team_block_dates_updated_at BEFORE UPDATE ON team_block_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_reminders_updated_at BEFORE UPDATE ON event_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quotation_items_updated_at BEFORE UPDATE ON quotation_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quotation_packages_updated_at BEFORE UPDATE ON quotation_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quotation_portals_updated_at BEFORE UPDATE ON quotation_portals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payment_milestones_updated_at BEFORE UPDATE ON payment_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER financial_years_updated_at BEFORE UPDATE ON financial_years FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER job_sheets_updated_at BEFORE UPDATE ON job_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER job_sheet_portals_updated_at BEFORE UPDATE ON job_sheet_portals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER plan_pricings_updated_at BEFORE UPDATE ON plan_pricings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER plan_limits_updated_at BEFORE UPDATE ON plan_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER workspace_subscriptions_updated_at BEFORE UPDATE ON workspace_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscription_payments_updated_at BEFORE UPDATE ON subscription_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upgrade_requests_updated_at BEFORE UPDATE ON upgrade_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER storage_usage_updated_at BEFORE UPDATE ON storage_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_auth_credentials_updated_at BEFORE UPDATE ON user_auth_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: Auto-set created_by_id on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to workspace-scoped tables
CREATE TRIGGER workspaces_set_created_by BEFORE INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER workspace_members_set_created_by BEFORE INSERT ON workspace_members FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER clients_set_created_by BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER leads_set_created_by BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER events_set_created_by BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER team_members_set_created_by BEFORE INSERT ON team_members FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER team_roles_set_created_by BEFORE INSERT ON team_roles FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER services_set_created_by BEFORE INSERT ON services FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER service_providers_set_created_by BEFORE INSERT ON service_providers FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER event_team_assignments_set_created_by BEFORE INSERT ON event_team_assignments FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER event_service_assignments_set_created_by BEFORE INSERT ON event_service_assignments FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER event_day_assignments_set_created_by BEFORE INSERT ON event_day_assignments FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER team_block_dates_set_created_by BEFORE INSERT ON team_block_dates FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER event_reminders_set_created_by BEFORE INSERT ON event_reminders FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER quotations_set_created_by BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER quotation_items_set_created_by BEFORE INSERT ON quotation_items FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER quotation_packages_set_created_by BEFORE INSERT ON quotation_packages FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER quotation_portals_set_created_by BEFORE INSERT ON quotation_portals FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER payment_milestones_set_created_by BEFORE INSERT ON payment_milestones FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER invoices_set_created_by BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER invoice_items_set_created_by BEFORE INSERT ON invoice_items FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER financial_years_set_created_by BEFORE INSERT ON financial_years FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER financial_transactions_set_created_by BEFORE INSERT ON financial_transactions FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER expense_categories_set_created_by BEFORE INSERT ON expense_categories FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER job_sheets_set_created_by BEFORE INSERT ON job_sheets FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER job_sheet_portals_set_created_by BEFORE INSERT ON job_sheet_portals FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER notifications_set_created_by BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER support_tickets_set_created_by BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER workspace_subscriptions_set_created_by BEFORE INSERT ON workspace_subscriptions FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER subscription_payments_set_created_by BEFORE INSERT ON subscription_payments FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER upgrade_requests_set_created_by BEFORE INSERT ON upgrade_requests FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER user_auth_credentials_set_created_by BEFORE INSERT ON user_auth_credentials FOR EACH ROW EXECUTE FUNCTION set_created_by();
CREATE TRIGGER push_subscriptions_set_created_by BEFORE INSERT ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- ============================================================
-- INDEXES — Performance-critical queries
-- ============================================================

-- Workspace-scoped queries (filter by workspace_id)
CREATE INDEX idx_clients_workspace ON clients(workspace_id);
CREATE INDEX idx_leads_workspace ON leads(workspace_id);
CREATE INDEX idx_events_workspace ON events(workspace_id);
CREATE INDEX idx_team_members_workspace ON team_members(workspace_id);
CREATE INDEX idx_team_roles_workspace ON team_roles(workspace_id);
CREATE INDEX idx_services_workspace ON services(workspace_id);
CREATE INDEX idx_service_providers_workspace ON service_providers(workspace_id);
CREATE INDEX idx_event_team_assignments_workspace ON event_team_assignments(workspace_id);
CREATE INDEX idx_event_service_assignments_workspace ON event_service_assignments(workspace_id);
CREATE INDEX idx_event_day_assignments_workspace ON event_day_assignments(workspace_id);
CREATE INDEX idx_team_block_dates_workspace ON team_block_dates(workspace_id);
CREATE INDEX idx_event_reminders_workspace ON event_reminders(workspace_id);
CREATE INDEX idx_quotations_workspace ON quotations(workspace_id);
CREATE INDEX idx_quotation_items_workspace ON quotation_items(workspace_id);
CREATE INDEX idx_quotation_packages_workspace ON quotation_packages(workspace_id);
CREATE INDEX idx_quotation_portals_workspace ON quotation_portals(workspace_id);
CREATE INDEX idx_payment_milestones_workspace ON payment_milestones(workspace_id);
CREATE INDEX idx_invoices_workspace ON invoices(workspace_id);
CREATE INDEX idx_invoice_items_workspace ON invoice_items(workspace_id);
CREATE INDEX idx_financial_years_workspace ON financial_years(workspace_id);
CREATE INDEX idx_financial_transactions_workspace ON financial_transactions(workspace_id);
CREATE INDEX idx_expense_categories_workspace ON expense_categories(workspace_id);
CREATE INDEX idx_job_sheets_workspace ON job_sheets(workspace_id);
CREATE INDEX idx_job_sheet_portals_workspace ON job_sheet_portals(workspace_id);
CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX idx_support_tickets_workspace ON support_tickets(workspace_id);
CREATE INDEX idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id);
CREATE INDEX idx_subscription_payments_workspace ON subscription_payments(workspace_id);
CREATE INDEX idx_upgrade_requests_workspace ON upgrade_requests(workspace_id);
CREATE INDEX idx_storage_usage_workspace ON storage_usage(workspace_id);

-- Foreign key lookups
CREATE INDEX idx_events_client ON events(client_id);
CREATE INDEX idx_event_team_assignments_event ON event_team_assignments(event_id);
CREATE INDEX idx_event_team_assignments_member ON event_team_assignments(team_member_id);
CREATE INDEX idx_event_service_assignments_event ON event_service_assignments(event_id);
CREATE INDEX idx_event_service_assignments_service ON event_service_assignments(service_id);
CREATE INDEX idx_event_day_assignments_event ON event_day_assignments(event_id);
CREATE INDEX idx_team_block_dates_member ON team_block_dates(team_member_id);
CREATE INDEX idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX idx_quotations_client ON quotations(client_id);
CREATE INDEX idx_quotations_event ON quotations(event_id);
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX idx_payment_milestones_quotation ON payment_milestones(quotation_id);
CREATE INDEX idx_payment_milestones_event ON payment_milestones(event_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_event ON invoices(event_id);
CREATE INDEX idx_invoices_quotation ON invoices(quotation_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_financial_transactions_event ON financial_transactions(event_id);
CREATE INDEX idx_financial_transactions_client ON financial_transactions(client_id);
CREATE INDEX idx_financial_transactions_team_member ON financial_transactions(team_member_id);
CREATE INDEX idx_financial_transactions_fy ON financial_transactions(financial_year_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_job_sheets_event ON job_sheets(event_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_user_auth_credentials_user ON user_auth_credentials(user_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Status filters (common query patterns)
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_payment_milestones_status ON payment_milestones(status);
CREATE INDEX idx_leads_status ON leads(status);

-- Public token lookups (portal access)
CREATE INDEX idx_quotations_public_token ON quotations(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_invoices_public_token ON invoices(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_job_sheets_public_token ON job_sheets(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_events_public_token ON events(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_quotation_portals_token ON quotation_portals(public_token);
CREATE INDEX idx_job_sheet_portals_token ON job_sheet_portals(public_token);
CREATE INDEX idx_clients_portal_token ON clients(portal_access_token) WHERE portal_access_token IS NOT NULL;
CREATE INDEX idx_team_members_portal_token ON team_members(portal_access_token) WHERE portal_access_token IS NOT NULL;

-- Unique constraints
CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(public_profile_slug) WHERE public_profile_slug IS NOT NULL;
CREATE UNIQUE INDEX idx_quotations_number ON quotations(workspace_id, quotation_number);
CREATE UNIQUE INDEX idx_invoices_number ON invoices(workspace_id, invoice_number);
CREATE UNIQUE INDEX idx_financial_years_fy ON financial_years(workspace_id, fy_id);