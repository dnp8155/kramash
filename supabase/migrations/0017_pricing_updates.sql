-- Update Limits for Free Plan
UPDATE plan_limits SET limit_value = '5' WHERE limit_key = 'max_events' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '3' WHERE limit_key = 'max_team_members' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '5' WHERE limit_key = 'max_services' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '50' WHERE limit_key = 'max_leads' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);

-- Free Boolean Flags
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'reminders_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'quotation_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'notifications_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'link_sharing_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'client_portal_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'team_portal_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'excel_csv_export_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'event_display_customization_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'quotation_logo_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);
UPDATE plan_limits SET limit_value = '0' WHERE limit_key = 'advanced_theme_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'FREE' LIMIT 1);

-- Update Limits for Pro Plan
UPDATE plan_limits SET limit_value = '999999' WHERE limit_key = 'max_events' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '50' WHERE limit_key = 'max_team_members' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '999999' WHERE limit_key = 'max_services' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '999999' WHERE limit_key = 'max_leads' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);

-- Pro Boolean Flags
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'reminders_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'quotation_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'notifications_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'link_sharing_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'client_portal_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'team_portal_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'excel_csv_export_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'event_display_customization_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'quotation_logo_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_limits SET limit_value = '1' WHERE limit_key = 'advanced_theme_enabled' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);

-- Update Pricing Values
UPDATE plan_pricings SET price = 1999, duration_months = 12 WHERE billing_cycle = 'ANNUAL' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_pricings SET price = 1099, duration_months = 6 WHERE billing_cycle = 'SIX_MONTHS' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
UPDATE plan_pricings SET price = 219, duration_months = 1 WHERE billing_cycle = 'MONTHLY' AND plan_id = (SELECT id FROM plans WHERE code = 'PRO' LIMIT 1);
