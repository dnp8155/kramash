-- ============================================================
-- 0006 — Storage Buckets & Policies
-- Run AFTER 0005_seed_data.sql
-- ============================================================

-- ============================================================
-- Storage Buckets
-- ============================================================

-- Public bucket for logos, public images
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT DO NOTHING;

-- Private bucket for invoices, quotations, job sheets, documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT DO NOTHING;

-- Private bucket for client-uploaded files
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-uploads', 'client-uploads', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Storage Policies — public-assets bucket
-- ============================================================

-- Anyone can read public assets
CREATE POLICY "public-assets-read" ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

-- Authenticated users can upload
CREATE POLICY "public-assets-upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public-assets' AND (auth.jwt() ->> 'role') = 'authenticated');

-- Users can update their own files
CREATE POLICY "public-assets-update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'public-assets' AND owner = auth.uid());

-- Users can delete their own files
CREATE POLICY "public-assets-delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'public-assets' AND owner = auth.uid());

-- ============================================================
-- Storage Policies — private-documents bucket
-- ============================================================

-- Only authenticated users can read (RLS still applies)
CREATE POLICY "private-docs-read" ON storage.objects FOR SELECT
  USING (bucket_id = 'private-documents' AND (auth.jwt() ->> 'role') = 'authenticated');

-- Authenticated users can upload
CREATE POLICY "private-docs-upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'private-documents' AND (auth.jwt() ->> 'role') = 'authenticated');

-- Users can update their own files
CREATE POLICY "private-docs-update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'private-documents' AND owner = auth.uid());

-- Users can delete their own files
CREATE POLICY "private-docs-delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'private-documents' AND owner = auth.uid());

-- ============================================================
-- Storage Policies — client-uploads bucket
-- ============================================================

-- Authenticated users can read
CREATE POLICY "client-uploads-read" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-uploads' AND (auth.jwt() ->> 'role') = 'authenticated');

-- Authenticated users can upload
CREATE POLICY "client-uploads-upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-uploads' AND (auth.jwt() ->> 'role') = 'authenticated');

-- Users can delete their own files
CREATE POLICY "client-uploads-delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-uploads' AND owner = auth.uid());