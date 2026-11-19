// ============================================================
// Base44 Client — Supabase-Backed Compatibility Layer
// ============================================================
// This app stores ALL data in Supabase and runs ALL backend logic
// as Supabase Edge Functions. Base44 is used ONLY as a frontend host.
//
// We re-export a merged `base44` object so existing service files
// that import { base44 } from "@/api/base44Client" continue to work:
//
//   - base44.entities.*      → Supabase (via supabaseClient entities proxy)
//   - base44.auth.*          → Supabase (via supabaseClient auth proxy)
//   - base44.functions.*     → Supabase Edge Functions (via invokeEdgeFunction)
//   - base44.integrations.*  → Supabase Storage
//   - base44.app.*           → stub (no Base44 app settings needed)
// ============================================================

import { entities, auth, storage } from '@/lib/supabaseClient';
import { invokeEdgeFunction } from '@/lib/edgeFunction';

// Supabase-backed file upload helpers
const supabaseUploadPublic = async ({ file }) => {
  const { file_url } = await storage.uploadPublic(file);
  return { file_url };
};
const supabaseUploadPrivate = async ({ file }) => {
  const { file_uri } = await storage.uploadPrivate(file);
  return { file_uri };
};
const supabaseCreateSignedUrl = async ({ file_uri, expires_in }) => {
  const { signed_url } = await storage.getSignedUrl(file_uri, expires_in);
  return { signed_url };
};

export const base44 = {
  // Data access — Supabase
  entities,
  // Auth — Supabase
  auth,
  // Backend functions — Supabase Edge Functions
  functions: {
    invoke: invokeEdgeFunction,
  },
  // File uploads — Supabase Storage
  integrations: {
    Core: {
      UploadFile: supabaseUploadPublic,
      UploadPublicFile: supabaseUploadPublic,
      UploadPrivateFile: supabaseUploadPrivate,
      CreateFileSignedUrl: supabaseCreateSignedUrl,
    }
  },
  // App-level settings — stub (not using Base44 app settings)
  app: {
    getPublicSettings: async () => null,
  },
  // User management & analytics — stubs (not used; users managed via Supabase auth)
  users: {
    inviteUser: async () => { throw new Error('Use Supabase auth admin to invite users'); },
  },
  analytics: {
    track: async () => {},
  },
};

export default base44;