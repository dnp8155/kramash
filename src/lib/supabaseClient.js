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
      if (filterObj) {
        Object.entries(filterObj).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(mapColumn(key), value);
          }
        });
      }
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
      if (filterObj) {
        Object.entries(filterObj).forEach(([key, value]) => {
          query = query.eq(mapColumn(key), value);
        });
      }
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
      if (filterObj) {
        Object.entries(filterObj).forEach(([key, value]) => {
          query = query.eq(mapColumn(key), value);
        });
      }
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
export const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return profile;
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user' } },
    });
    if (error) throw error;
    return data;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
    if (error) throw error;
    return data;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ email, type: 'signup' });
    if (error) throw error;
    return true;
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