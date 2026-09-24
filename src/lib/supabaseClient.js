import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConfig';

// ============================================================
// Supabase Client — initialized from config file
// ============================================================
// Base44 secrets are NOT injected into the browser build.
// We use a config file (src/lib/supabaseConfig.js) instead.
// The Supabase URL and anon key are PUBLIC values (safe for browser).
// ============================================================

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

const isConfigValid = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('PASTE_YOUR');

if (!isConfigValid) {
  console.error('[Supabase] Missing or invalid config. Edit src/lib/supabaseConfig.js and paste your Supabase URL and anon key.');
}

// Export for other modules to check
export const isSupabaseConfigured = isConfigValid;

// Create client safely — if createClient throws (e.g. realtime WebSocket init
// fails in certain environments), fall back to a minimal stub so the app can
// at least render an error instead of showing a blank screen.
let supabase;
try {
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    }
  );
} catch (e) {
  console.error('[Supabase] createClient failed, using stub:', e);
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: { message: 'Supabase not initialized' } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => {},
      signInWithPassword: async () => { throw { message: 'Supabase not initialized' }; },
      signUp: async () => { throw { message: 'Supabase not initialized' }; },
      signInWithOAuth: async () => { throw { message: 'Supabase not initialized' }; },
      resetPasswordForEmail: async () => { throw { message: 'Supabase not initialized' }; },
      updateUser: async () => { throw { message: 'Supabase not initialized' }; },
      verifyEmailOtp: async () => { throw { message: 'Supabase not initialized' }; },
      resend: async () => { throw { message: 'Supabase not initialized' }; },
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not initialized' } }), limit: () => ({ data: [], error: null }), order: () => ({ data: [], error: null }) }),
        limit: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not initialized' } }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase not initialized' } }) }) }) }),
      delete: () => ({ eq: () => ({ error: { message: 'Supabase not initialized' } }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    functions: { invoke: async () => { throw { message: 'Supabase not initialized' }; } },
  };
}

export { supabase };

// ============================================================
// Entity helper — mimics base44.entities API for easier migration
// ============================================================
//
// Usage (drop-in replacement for base44.entities.X):
//
//   import { entities } from '@/lib/supabaseClient';
//
//   const { data } = await entities.clients.list();
//   const { data } = await entities.clients.filter({ status: 'active' });
//   const { data } = await entities.clients.create({ name: 'Rahul' });
//   const { data } = await entities.clients.update(id, { name: 'Rahul S' });
//   const { data } = await entities.clients.delete(id);
//
//   // Realtime subscription
//   const unsub = entities.events.subscribe((event) => { ... });
//
// ============================================================

// Map Base44 column names to Supabase column names
// Base44 used created_date/updated_date; Supabase uses created_at/updated_at
function mapColumn(col) {
  if (col === 'created_date') return 'created_at';
  if (col === 'updated_date') return 'updated_at';
  return col;
}

// Map sort parameter (e.g., "-created_date" → "-created_at")
function mapSort(sort) {
  if (!sort) return sort;
  const descending = sort.startsWith('-');
  const col = descending ? sort.slice(1) : sort;
  return (descending ? '-' : '') + mapColumn(col);
}

// Get current user ID from Supabase session (for created_by_id auto-set)
async function getCurrentUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// Strip auto-managed fields from update objects (triggers handle these)
function stripAutoFields(obj) {
  const stripped = { ...obj };
  delete stripped.created_date;
  delete stripped.updated_date;
  delete stripped.created_at;
  delete stripped.updated_at;
  return stripped;
}

// Enrich a record with created_by_id if not already set
async function enrichWithCreatedBy(record) {
  if (record.created_by_id) return record;
  const userId = await getCurrentUserId();
  if (!userId) return record;
  return { ...record, created_by_id: userId };
}

// Apply a Base44-style filter object to a Supabase query.
// Supports plain values (eq) and MongoDB-style operators:
//   { $gte, $lte, $gt, $lt, $ne, $in }
function applyFilter(query, filterObj) {
  if (!filterObj) return query;
  for (const [key, rawValue] of Object.entries(filterObj)) {
    if (rawValue === undefined || rawValue === null) continue;
    const col = mapColumn(key);
    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      for (const [op, val] of Object.entries(rawValue)) {
        switch (op) {
          case '$gte': query = query.gte(col, val); break;
          case '$lte': query = query.lte(col, val); break;
          case '$gt': query = query.gt(col, val); break;
          case '$lt': query = query.lt(col, val); break;
          case '$ne': query = query.neq(col, val); break;
          case '$in': query = query.in(col, Array.isArray(val) ? val : [val]); break;
          default: query = query.eq(col, rawValue); break;
        }
      }
    } else {
      query = query.eq(col, rawValue);
    }
  }
  return query;
}

// Add Base44-compatible timestamp aliases (created_date, updated_date)
// to records returned from Supabase so existing app code keeps working
function withDateAliases(record) {
  if (!record || typeof record !== 'object') return record;
  return {
    ...record,
    ...(record.created_at ? { created_date: record.created_at } : {}),
    ...(record.updated_at ? { updated_date: record.updated_at } : {}),
  };
}

function withDateAliasesArray(records) {
  if (!Array.isArray(records)) return records;
  return records.map(withDateAliases);
}

function createEntityProxy(tableName) {
  return {
    // List all (with optional sort + limit)
    async list(sort, limit) {
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const s = mapSort(sort);
        query = query.order(s.startsWith('-') ? s.slice(1) : s, { ascending: !s.startsWith('-') });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return withDateAliasesArray(data);
    },

    // Filter with query object
    async filter(filterObj, sort, limit) {
      let query = supabase.from(tableName).select('*');
      query = applyFilter(query, filterObj);
      if (sort) {
        const s = mapSort(sort);
        query = query.order(s.startsWith('-') ? s.slice(1) : s, { ascending: !s.startsWith('-') });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return withDateAliasesArray(data);
    },

    // Get single by ID
    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return withDateAliases(data);
    },

    // Create — auto-sets created_by_id from current session
    async create(record) {
      const enriched = await enrichWithCreatedBy(record);
      const { data, error } = await supabase.from(tableName).insert(enriched).select('*').single();
      if (error) throw error;
      return withDateAliases(data);
    },

    // Bulk create — auto-sets created_by_id from current session
    async bulkCreate(records) {
      const userId = await getCurrentUserId();
      const enriched = userId
        ? records.map((r) => (r.created_by_id ? r : { ...r, created_by_id: userId }))
        : records;
      const { data, error } = await supabase.from(tableName).insert(enriched).select('*');
      if (error) throw error;
      return withDateAliasesArray(data);
    },

    // Update — strips auto-managed timestamp fields
    async update(id, updates) {
      const clean = stripAutoFields(updates);
      const { data, error } = await supabase.from(tableName).update(clean).eq('id', id).select('*').single();
      if (error) throw error;
      return withDateAliases(data);
    },

    // Bulk update (different changes per record)
    async bulkUpdate(records) {
      const results = [];
      for (const record of records) {
        const { id, ...updates } = record;
        const clean = stripAutoFields(updates);
        const { data, error } = await supabase.from(tableName).update(clean).eq('id', id).select('*').single();
        if (error) throw error;
        results.push(withDateAliases(data));
      }
      return results;
    },

    // Update many (same change to all matches)
    async updateMany(filterObj, updateObj) {
      const clean = stripAutoFields(updateObj);
      let query = supabase.from(tableName).update(clean);
      query = applyFilter(query, filterObj);
      const { data, error } = await query.select('*');
      if (error) throw error;
      return withDateAliasesArray(data);
    },

    // Delete
    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    // Delete many
    async deleteMany(filterObj) {
      let query = supabase.from(tableName).delete();
      query = applyFilter(query, filterObj);
      const { error } = await query;
      if (error) throw error;
      return true;
    },

    // Subscribe to realtime changes
    // Uses a unique channel name per subscription so multiple subscribers
    // (or remounts) don't collide with "cannot add 'postgres_changes' callbacks".
    subscribe(callback) {
      const channelName = `${tableName}_changes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          const eventType = payload.eventType.toLowerCase().replace('insert', 'create').replace('update', 'update').replace('delete', 'delete');
          const rawData = payload.new || payload.old;
          // Add Base44-compatible aliases for timestamp fields
          const data = rawData
            ? {
                ...rawData,
                ...(rawData.created_at ? { created_date: rawData.created_at } : {}),
                ...(rawData.updated_at ? { updated_date: rawData.updated_at } : {}),
              }
            : rawData;
          callback({
            id: data?.id || payload.old?.id,
            type: eventType,
            data,
          });
        })
        .subscribe();
      return () => {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
      };
    },

    // Get schema (for compatibility)
    schema() {
      return Promise.resolve({});
    },
  };
}

// ============================================================
// All entity proxies (matches Base44 entity names)
// ============================================================
export const entities = {
  Workspace: createEntityProxy('workspaces'),
  WorkspaceMember: createEntityProxy('workspace_members'),
  Client: createEntityProxy('clients'),
  Lead: createEntityProxy('leads'),
  Event: createEntityProxy('events'),
  TeamMember: createEntityProxy('team_members'),
  TeamRole: createEntityProxy('team_roles'),
  Service: createEntityProxy('services'),
  ServiceProvider: createEntityProxy('service_providers'),
  EventTeamAssignment: createEntityProxy('event_team_assignments'),
  EventServiceAssignment: createEntityProxy('event_service_assignments'),
  EventDayAssignment: createEntityProxy('event_day_assignments'),
  TeamBlockDate: createEntityProxy('team_block_dates'),
  EventReminder: createEntityProxy('event_reminders'),
  Quotation: createEntityProxy('quotations'),
  QuotationItem: createEntityProxy('quotation_items'),
  QuotationPackage: createEntityProxy('quotation_packages'),
  QuotationPortal: createEntityProxy('quotation_portals'),
  PaymentMilestone: createEntityProxy('payment_milestones'),
  Invoice: createEntityProxy('invoices'),
  InvoiceItem: createEntityProxy('invoice_items'),
  FinancialYear: createEntityProxy('financial_years'),
  FinancialTransaction: createEntityProxy('financial_transactions'),
  ExpenseCategory: createEntityProxy('expense_categories'),
  JobSheet: createEntityProxy('job_sheets'),
  JobSheetPortal: createEntityProxy('job_sheet_portals'),
  Notification: createEntityProxy('notifications'),
  SupportTicket: createEntityProxy('support_tickets'),
  Plan: createEntityProxy('plans'),
  PlanPricing: createEntityProxy('plan_pricings'),
  PlanLimit: createEntityProxy('plan_limits'),
  WorkspaceSubscription: createEntityProxy('workspace_subscriptions'),
  SubscriptionPayment: createEntityProxy('subscription_payments'),
  UpgradeRequest: createEntityProxy('upgrade_requests'),
  StorageUsage: createEntityProxy('storage_usage'),
  UserAuthCredential: createEntityProxy('user_auth_credentials'),
  PushSubscription: createEntityProxy('push_subscriptions'),
  User: createEntityProxy('profiles'),
};

// ============================================================
// Auth helper — mimics base44.auth API
// ============================================================

// Manually persist Supabase session to localStorage.
// The Supabase client's auto-persist may not work with the publishable
// key format in all environments, so we do it explicitly.
function persistSession(data) {
  if (!data?.session?.access_token) return;
  try {
    const projectRef = (supabaseUrl || '').replace('https://', '').split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const sessionObj = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type || 'bearer',
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + (data.session.expires_in || 3600),
      user: data.user || data.session.user,
    };
    localStorage.setItem(storageKey, JSON.stringify(sessionObj));
  } catch { /* noop */ }
}

// Read the manually persisted session from localStorage.
function getStoredSession() {
  try {
    const projectRef = (supabaseUrl || '').replace('https://', '').split('.')[0];
    const stored = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.access_token && (!parsed.expires_at || parsed.expires_at > Date.now() / 1000)) {
      return parsed;
    }
  } catch { /* noop */ }
  return null;
}

// Get the access token from either the Supabase client or localStorage.
function getAccessToken() {
  return getStoredSession()?.access_token || null;
}

export const auth = {
  async me() {
    let { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const stored = getStoredSession();
      if (stored?.user) user = stored.user;
    }
    if (!user) throw new Error('Not authenticated');
    const token = getAccessToken();
    if (token) {
      const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` },
      });
      const arr = await resp.json();
      if (arr && arr.length > 0) return arr[0];
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return profile;
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
    return !!getStoredSession();
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user' } },
    });
    if (error) {
      let msg = error.message || error.msg || '';
      if (!msg || msg === '{}') {
        if (error.status >= 500) msg = 'Server error during signup. Please try again later.';
        else if (error.status === 429) msg = 'Too many attempts. Please wait a moment.';
        else msg = 'Failed to create account. Please try again.';
      }
      throw new Error(msg);
    }
    persistSession(data);
    return data;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    persistSession(data);
    return data;
  },

  async loginWithProvider(provider, fromUrl) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: fromUrl || window.location.origin },
    });
    if (error) throw error;
    return data;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    // Also clear manually persisted session
    try {
      const projectRef = (supabaseUrl || '').replace('https://', '').split('.')[0];
      localStorage.removeItem(`sb-${projectRef}-auth-token`);
    } catch { /* noop */ }
    if (redirectUrl) window.location.href = redirectUrl;
    else window.location.reload();
  },

  async updateMe(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: updated, error } = await supabase.from('profiles').update(data).eq('id', user.id).select('*').single();
    if (error) throw error;
    return updated;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyEmailOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw new Error(error.message || error.msg || error.error_description || String(error));
    persistSession(data);
    return data;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ email, type: 'signup' });
    if (error) throw new Error(error.message || error.msg || error.error_description || String(error));
    return true;
  },

  async setSession(session) {
    if (!session?.access_token) throw new Error('No access token');
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw error;
    persistSession(data);
    return data;
  },

  async redirectToLogin(nextUrl) {
    const currentUrl = nextUrl || window.location.pathname;
    window.location.href = `/login?returnTo=${encodeURIComponent(currentUrl)}`;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================
// Storage helper — mimics base44.integrations.Core
// ============================================================
export const storage = {
  async uploadPublic(file, path) {
    const fileName = path || `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('public-assets').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(fileName);
    return { file_url: urlData.publicUrl };
  },

  async uploadPrivate(file, path) {
    const fileName = path || `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('private-documents').upload(fileName, file);
    if (error) throw error;
    return { file_uri: `${fileName}` };
  },

  async getSignedUrl(fileUri, expiresIn = 300) {
    const { data, error } = await supabase.storage.from('private-documents').createSignedUrl(fileUri, expiresIn);
    if (error) throw error;
    return { signed_url: data.signedUrl };
  },
};

export default supabase;