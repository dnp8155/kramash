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
// PostgREST rejects a token whose `iat` is slightly ahead of its own clock
// ("JWT issued at future", PGRST303). That happens for a moment after a token
// refresh when the auth server's clock runs ahead of the API's, so retry
// those 401s a few times with a short wait instead of surfacing the error.
const JWT_FUTURE_RETRY_DELAYS_MS = [400, 1000, 2000];

async function fetchWithJwtSkewRetry(input, init) {
  let res = await fetch(input, init);
  for (const delay of JWT_FUTURE_RETRY_DELAYS_MS) {
    if (res.status !== 401) return res;
    let body = '';
    try { body = await res.clone().text(); } catch { return res; }
    if (!/issued at future/i.test(body)) break; // some other 401 — handled below
    await new Promise((r) => setTimeout(r, delay));
    res = await fetch(input, init);
  }
  return replayIfTokenExpired(res, input, init);
}

// A data request rejected because the access token EXPIRED (typical after the tab slept for a while):
// refresh the session once, then replay the request with the new token, so the page gets its data instead
// of an error — or, worse, an empty list. Only /rest/v1/ calls are retried (never the auth endpoints).
async function replayIfTokenExpired(res, input, init) {
  if (res.status !== 401) return res;
  const url = typeof input === 'string' ? input : input?.url || '';
  if (!url.includes('/rest/v1/')) return res;
  let body = '';
  try { body = await res.clone().text(); } catch { return res; }
  if (!/jwt expired|PGRST301/i.test(body)) return res;
  const fresh = await ensureFreshSession({ force: true });
  if (!fresh.ok) return res;
  let token = null;
  try { token = (await supabase.auth.getSession())?.data?.session?.access_token || null; } catch { /* noop */ }
  if (!token) return res;
  const headers = new Headers(init?.headers || (typeof input !== 'string' ? input?.headers : undefined));
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

let supabase;
try {
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      global: { fetch: fetchWithJwtSkewRetry },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
        // When the connection drops (sleep, Wi-Fi change, offline) the browser logs a red WebSocket error for
        // every attempt. Back off 1s → 2s → 5s → 10s → 30s instead of hammering the server every second.
        reconnectAfterMs: (tries) => [1000, 2000, 5000, 10000, 30000][Math.min(tries, 5) - 1] || 1000,
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
      verifyOtp: async () => { throw { message: 'Supabase not initialized' }; },
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
// Uses the locally cached session (no network round-trip, unlike getUser()) —
// this runs before every create, so a network call here slows every save.
async function getCurrentUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// Strip auto-managed fields from update objects (triggers handle these)
function stripAutoFields(obj) {
  const stripped = nullifyEmptyIds({ ...obj });
  delete stripped.created_date;
  delete stripped.updated_date;
  delete stripped.created_at;
  delete stripped.updated_at;
  return stripped;
}

// Postgres rejects "" for UUID columns ("invalid input syntax for type uuid"). The UI often
// uses "" for "nothing selected", so turn empty *_id values into null before writing.
// Text columns that happen to end in _id are left alone.
const TEXT_ID_COLUMNS = new Set([
  "credential_id", "fy_id", "gateway_order_id", "gateway_payment_id",
  "member_type_id", "reference_id", "related_entity_id", "template_id", "display_id",
]);
function nullifyEmptyIds(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  let out = record;
  for (const [k, v] of Object.entries(record)) {
    if (v === "" && k.endsWith("_id") && !TEXT_ID_COLUMNS.has(k)) {
      if (out === record) out = { ...record };
      out[k] = null;
    }
  }
  return out;
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
      const enriched = nullifyEmptyIds(await enrichWithCreatedBy(record));
      const { data, error } = await supabase.from(tableName).insert(enriched).select('*').single();
      if (error) throw error;
      return withDateAliases(data);
    },

    // Bulk create — auto-sets created_by_id from current session
    async bulkCreate(records) {
      const userId = await getCurrentUserId();
      const enriched = (userId
        ? records.map((r) => (r.created_by_id ? r : { ...r, created_by_id: userId }))
        : records).map(nullifyEmptyIds);
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
// An expired access token is still a valid login as long as its refresh token is around — Supabase
// swaps it for a new one on the next request — so pass { allowExpired: true } for "is the user signed in".
function getStoredSession({ allowExpired = false } = {}) {
  try {
    const projectRef = (supabaseUrl || '').replace('https://', '').split('.')[0];
    const stored = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.access_token && (!parsed.expires_at || parsed.expires_at > Date.now() / 1000)) {
      return parsed;
    }
    if (allowExpired && parsed.refresh_token) return parsed;
  } catch { /* noop */ }
  return null;
}

// Refresh failures that mean "this login is really gone" (revoked / already-used refresh token),
// as opposed to being offline or a server hiccup, which must never sign the user out.
export function isDefinitiveAuthFailure(error) {
  if (!error) return false;
  const status = error.status;
  const msg = String(error.message || '').toLowerCase();
  if (status === 400 || status === 401 || status === 403) {
    return /invalid|revoked|not found|expired|already used|refresh token/.test(msg) || status === 401 || status === 403;
  }
  return false;
}

// ---- Keeping the login alive ------------------------------------------------------------------------
// Make sure the access token is fresh (refreshing it when it is expired or about to expire). All callers
// share one in-flight refresh. The result tells the caller what really happened:
//   { ok: true }                       — a valid session is in place
//   { ok: false, reason: 'network' }   — could not reach the server: a hiccup, NOT a logout, try again later
//   { ok: false, reason: 'invalid' }   — the refresh token was rejected: the login is really gone
//   { ok: false, reason: 'no-session' }— nothing stored to refresh from: signed out
const REFRESH_AHEAD_SECONDS = 300;
const REFRESH_RETRY_DELAYS_MS = [0, 800, 2500];
let refreshInFlight = null;

export function ensureFreshSession({ force = false } = {}) {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    let session = null;
    try { session = (await supabase.auth.getSession())?.data?.session || null; } catch { /* offline — use the stored copy */ }
    let refreshToken = null;
    if (!session) {
      // The client has no live session — try to rebuild one from the refresh token we persisted.
      refreshToken = getStoredSession({ allowExpired: true })?.refresh_token || null;
      if (!refreshToken) return { ok: false, reason: 'no-session' };
    } else if (!force && (session.expires_at || 0) - Date.now() / 1000 > REFRESH_AHEAD_SECONDS) {
      return { ok: true };
    }

    let lastError = null;
    for (const delay of REFRESH_RETRY_DELAYS_MS) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        const { data, error } = await supabase.auth.refreshSession(refreshToken ? { refresh_token: refreshToken } : undefined);
        if (data?.session?.access_token) return { ok: true };
        lastError = error;
        if (error && isDefinitiveAuthFailure(error)) return { ok: false, reason: 'invalid', error };
      } catch (e) {
        lastError = e;
      }
    }
    return { ok: false, reason: 'network', error: lastError };
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

// Get the access token from either the Supabase client or localStorage.
function getAccessToken() {
  return getStoredSession()?.access_token || null;
}

// Last-known profile, cached purely so a refresh while offline can keep the
// user logged in (see auth.me() below) instead of bouncing them to /login.
const CACHED_PROFILE_KEY = 'kramasha_cached_profile';

function cacheProfile(profile) {
  if (!profile?.id) return;
  try { localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile)); } catch { /* noop */ }
}

function getCachedProfile(userId) {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id === userId ? parsed : null;
  } catch {
    return null;
  }
}

// Concurrent auth.me() calls share one request: many components ask for the profile at the same moment on load,
// and a failing request used to be repeated for each of them. (Nothing is cached afterwards, so a profile edit is seen at once.)
let mePromise = null;

async function loadMe() {
  // getSession() reads the already-verified session from local storage (no
  // network round trip); getUser() would re-validate the JWT against the
  // Supabase Auth server on every call, which was adding an extra ~200-500ms
  // hop to every page/component that calls auth.me() (see notificationService,
  // planService). It can also throw if it tries a background token refresh
  // while offline, so it's wrapped below — an offline refresh should never
  // by itself look like "not authenticated".
  let session = null;
  try {
    session = (await supabase.auth.getSession())?.data?.session || null;
  } catch { /* offline — fall back to the manually persisted session below */ }
  let user = session?.user;
  if (!user) {
    const stored = getStoredSession();
    if (stored?.user) user = stored.user;
  }
  if (!user) throw new Error('Not authenticated');

  try {
    // Prefer the Supabase session's token: getSession() has already swapped an expired one for a fresh one.
    let token = session?.access_token || getAccessToken();
    if (token) {
      const fetchProfile = (t) => fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${t}` },
      });
      let resp = await fetchProfile(token);
      // A rejected token can come back as 400 as well as 401/403 (an expired or not-yet-valid JWT after the
      // laptop/phone was asleep); either way, refresh once and retry before treating it as a real failure.
      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        // Token may just be stale (app resumed after a long time): refresh once and retry before giving up.
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          token = refreshed.session.access_token;
          resp = await fetchProfile(token);
        } else if (refreshError && !isDefinitiveAuthFailure(refreshError)) {
          throw refreshError; // network / server problem — handled as "offline" below
        }
      }
      if (resp.ok) {
        const arr = await resp.json();
        if (arr && arr.length > 0) {
          cacheProfile(arr[0]);
          return arr[0];
        } else if (arr && arr.length === 0) {
          // Profile not yet created (e.g. new user), return minimal user object
          return { id: user.id, email: user.email };
        }
      } else if (resp.status === 401 || resp.status === 403) {
        // Server reachable and it rejected the token — this is a real,
        // not-offline logout. Don't mask it with cached data.
        throw new Error('Session expired');
      } else {
        // The profile request failed for another reason (server hiccup, 400/5xx). Reuse the last-known profile
        // instead of firing a second identical request that would fail the same way.
        const cached = getCachedProfile(user.id);
        if (cached) return cached;
      }
    }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    if (profile) cacheProfile(profile);
    return profile || { id: user.id, email: user.email };
  } catch (err) {
    if (err?.message === 'Session expired') {
      // Prevent auto logout: Treat session expired as offline so user stays logged in visually.
      // If the token is truly dead, subsequent API calls will fail, but the app won't auto-logout.
    }
    // Any other failure here (fetch throwing, Supabase client erroring) is
    // most likely "we're offline" rather than "logged out" — the token
    // itself was never rejected by the server. Keep the user signed in
    // with their last-known profile rather than kicking them to /login.
    const cached = getCachedProfile(user.id);
    if (cached) return cached;
    throw err;
  }
}

export const auth = {
  me() {
    if (mePromise) return mePromise;
    mePromise = loadMe().finally(() => { mePromise = null; });
    return mePromise;
  },

  async isAuthenticated() {
    let session = null;
    try {
      session = (await supabase.auth.getSession())?.data?.session || null;
    } catch { /* offline — fall back to the stored session */ }
    if (session) return true;
    // No live session, but a stored refresh token means the login is still good (e.g. the token expired
    // while the app was closed or offline). Only an explicit sign-out or a revoked refresh token ends it.
    return !!getStoredSession({ allowExpired: true });
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user' } },
    });

    if (error) {
      let rawMsg = error.message || error.error_description || error.msg || '';
      
      // If error is Supabase default SMTP rate limit (500 Server error during signup or 429)
      if (rawMsg.toLowerCase().includes('server error during signup') || error.status === 429) {
        // Try logging in in case user account was created
        try {
          const loginRes = await supabase.auth.signInWithPassword({ email, password });
          if (loginRes?.data?.session) {
            persistSession(loginRes.data);
            return loginRes.data;
          }
        } catch { /* proceed to throw error */ }

        rawMsg = "Supabase Email Rate Limit hit (3 emails/hour on default mailer). Please wait a few minutes or try again shortly.";
      } else if (rawMsg.toLowerCase().includes('already registered') || rawMsg.toLowerCase().includes('user_already_exists')) {
        rawMsg = "An account with this email already exists. Please log in instead.";
      }

      throw new Error(rawMsg || "Failed to create account. Please try again.");
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
    if (typeof window !== 'undefined') {
      window.__isExplicitLogout = true;
    }
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
    let { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) {
      const res = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
      data = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message || error.msg || error.error_description || String(error));
    persistSession(data);
    return data;
  },

  async resendOtp(email) {
    let { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      const fallback = await supabase.auth.signInWithOtp({ email }).catch((e) => ({ error: e }));
      error = fallback.error;
    }
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

// Setup a global auth state listener to ensure the manually persisted session
// stays in sync when Supabase automatically refreshes the token in the background.
// Nudge a token refresh when the app comes back to the foreground or the network returns: browsers
// throttle timers in background tabs / installed PWAs, so the access token can lapse while away.
if (typeof window !== 'undefined' && supabase?.auth?.getSession) {
  const nudgeRefresh = () => {
    if (document.visibilityState === 'hidden') return;
    supabase.auth.startAutoRefresh?.();
    supabase.auth.getSession().catch(() => {});
  };
  document.addEventListener('visibilitychange', nudgeRefresh);
  window.addEventListener('online', nudgeRefresh);
  window.addEventListener('focus', nudgeRefresh);
}

if (supabase?.auth?.onAuthStateChange) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session) {
        persistSession({ session, user: session.user });
      }
    } else if (event === 'SIGNED_OUT') {
      // Prevent automatic background logouts. Only clear session if user explicitly logged out.
      if (typeof window !== 'undefined' && !window.__isExplicitLogout) {
        return;
      }
      try {
        const projectRef = (supabaseUrl || '').replace('https://', '').split('.')[0];
        localStorage.removeItem(`sb-${projectRef}-auth-token`);
      } catch { /* noop */ }
    }
  });
}

export default supabase;