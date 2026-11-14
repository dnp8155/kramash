ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"in_app":true,"push":true,"email":true,"events":true,"quotations":true,"invoices":true}'::jsonb;
