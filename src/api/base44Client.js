// ============================================================
// Base44 Client — Supabase-Backed Compatibility Layer
// ============================================================
// This app stores ALL data in Supabase (not Base44's database).
// We re-export a merged `base44` object so existing service files
// that import { base44 } from "@/api/base44Client" continue to work:
//
//   - base44.entities.*  → Supabase (via supabaseClient entities proxy)
//   - base44.auth.*      → Supabase (via supabaseClient auth proxy)
//   - base44.functions.* → Base44 SDK (invokes Base44 backend functions
//                         that themselves use Supabase internally)
//   - base44.integrations.Core.UploadFile/UploadPublicFile/Private
//                         → Supabase Storage
// ============================================================

import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { entities, auth, storage } from '@/lib/supabaseClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Base44 SDK — used ONLY for backend function invocation
const base44Sdk = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});

// Supabase-backed file upload helpers (replace Base44 storage)
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
  // Backend functions — Base44 SDK (functions use Supabase internally)
  functions: base44Sdk.functions,
  // File uploads — Supabase Storage
  integrations: {
    Core: {
      UploadFile: supabaseUploadPublic,
      UploadPublicFile: supabaseUploadPublic,
      UploadPrivateFile: supabaseUploadPrivate,
      CreateFileSignedUrl: supabaseCreateSignedUrl,
    }
  },
  // App-level settings — Base44 SDK
  app: base44Sdk.app,
  // User management & analytics — Base44 SDK (if needed later)
  users: base44Sdk.users,
  analytics: base44Sdk.analytics,
};

export default base44;