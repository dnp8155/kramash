// "Work from others": bookings a business made for this person (as their team member), shown read-only inside this
// person's OWN Kramasha app once they accept. Data comes from migration 0079 (get_my_outside_work /
// get_member_app_invites / respond_member_app_link). Before that migration is applied every call quietly returns
// nothing, so the feature simply stays hidden. Free on every plan.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { assembleTeamPortalData } from "@/lib/teamPortalAccess";
import { groupByEvent, todayLocal } from "@/lib/teamWork";

// Calendar chip for these bookings: cocoa brown with a dashed outline (used nowhere else in the app).
export const OUTSIDE_CHIP = "bg-outside/10 text-outside border-dashed border-outside/60";
export const OUTSIDE_BAR = "bg-outside";

const rpc = async (name, args) => {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

// One entry per business: { workspace, member, summary, groups (one card per event), payments, raw }.
export async function fetchOutsideWork() {
  let payloads = [];
  try { payloads = (await rpc("get_my_outside_work")) || []; } catch { return []; }
  return (Array.isArray(payloads) ? payloads : [])
    .filter((p) => p && !p.error)
    .map((p) => {
      const d = assembleTeamPortalData(p);
      const groups = groupByEvent([...(d.upcoming || []), ...(d.past || [])]);
      return { ...d, groups };
    })
    .sort((a, b) => String(a.workspace?.name || "").localeCompare(String(b.workspace?.name || "")));
}

// Businesses that switched it on for my email, with my answer so far (null = not asked yet).
export async function fetchMemberAppInvites() {
  try { const r = await rpc("get_member_app_invites"); return Array.isArray(r) ? r : []; } catch { return []; }
}

export async function respondMemberAppLink(memberId, accept) {
  return rpc("respond_member_app_link", { p_member_id: memberId, p_accept: !!accept });
}

export const OUTSIDE_KEY = ["outside-work"];
export const INVITES_KEY = ["outside-work-invites"];

export function useOutsideWork(enabled = true) {
  return useQuery({ queryKey: OUTSIDE_KEY, queryFn: fetchOutsideWork, enabled, staleTime: 60 * 1000, refetchOnWindowFocus: true });
}

export function useMemberAppInvites(enabled = true) {
  return useQuery({ queryKey: INVITES_KEY, queryFn: fetchMemberAppInvites, enabled, staleTime: 5 * 60 * 1000 });
}

export function useRefreshOutsideWork() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: OUTSIDE_KEY }), qc.invalidateQueries({ queryKey: INVITES_KEY })]);
}

// "Show on Events page" (switch on the Work from others page): the person's own choice, saved on their profile
// (profiles.notification_preferences.outside_on_events) so it is the same on every device. Missing = ON.
const SHOW_ON_EVENTS_KEY = ["outside-on-events"];
// The last answer is also kept on this device (per signed-in person), so the Events page knows it straight away on
// the next open. Without it the section used to show for a moment and then vanish when the switch was off.
const LOCAL_ON_EVENTS_KEY = "kramasha:outside-on-events";
function signedInUserId() {
  try {
    let k = null;
    for (let i = 0; i < localStorage.length && !k; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) k = key;
    }
    return k ? JSON.parse(localStorage.getItem(k) || "null")?.user?.id || null : null;
  } catch { return null; }
}
export function rememberedShowOnEvents() {
  try {
    const uid = signedInUserId();
    const v = JSON.parse(localStorage.getItem(LOCAL_ON_EVENTS_KEY) || "null");
    return uid && v && v.uid === uid && typeof v.on === "boolean" ? v.on : undefined;
  } catch { return undefined; }
}
function rememberShowOnEvents(on) {
  try {
    const uid = signedInUserId();
    if (uid) localStorage.setItem(LOCAL_ON_EVENTS_KEY, JSON.stringify({ uid, on: !!on }));
  } catch { /* storage unavailable: it is just read from the profile each time */ }
}
async function readShowOnEvents() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return true;
  const { data, error } = await supabase.from("profiles").select("notification_preferences").eq("id", user.id).maybeSingle();
  if (error) throw error;
  const on = (data?.notification_preferences || {}).outside_on_events !== false;
  rememberShowOnEvents(on);
  return on;
}
export function useOutsideOnEvents() {
  const qc = useQueryClient();
  // Until the saved choice is known (first open on this device), the section stays hidden rather than flashing.
  const { data, isLoading } = useQuery({ queryKey: SHOW_ON_EVENTS_KEY, queryFn: readShowOnEvents, staleTime: 5 * 60 * 1000, initialData: rememberedShowOnEvents, initialDataUpdatedAt: 0 });
  const setOn = async (on) => {
    const prev = qc.getQueryData(SHOW_ON_EVENTS_KEY);
    qc.setQueryData(SHOW_ON_EVENTS_KEY, on); // switch moves at once
    rememberShowOnEvents(on);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      // Read-merge-write so the person's notification settings in the same field are kept.
      const { data: cur, error: readError } = await supabase.from("profiles").select("notification_preferences").eq("id", user.id).single();
      if (readError) throw readError;
      const next = { ...(cur?.notification_preferences || {}), outside_on_events: !!on };
      const { error } = await supabase.from("profiles").update({ notification_preferences: next }).eq("id", user.id);
      if (error) throw error;
    } catch (e) {
      qc.setQueryData(SHOW_ON_EVENTS_KEY, prev);
      if (typeof prev === "boolean") rememberShowOnEvents(prev);
      else { try { localStorage.removeItem(LOCAL_ON_EVENTS_KEY); } catch { /* ignore */ } }
      throw e;
    }
  };
  // Events page: shown only once the choice is known to be ON. The switch on Work from others shows ON while unknown
  // (missing = ON), so it never looks off by mistake.
  return { on: data !== false, showOnEvents: data === true, loading: isLoading, setOn };
}

// The next jobs from others still to come (or running today), soonest first — for the Events page strip.
export function upcomingOutsideItems(businesses, max = 3) {
  const today = todayLocal();
  return outsideCalendarItems(businesses)
    .map((e) => ({ ...e, __next: (e.event_dates || []).find((d) => d >= today) || null }))
    .filter((e) => e.__next)
    .sort((a, b) => (a.__next > b.__next ? 1 : a.__next < b.__next ? -1 : 0))
    .slice(0, max);
}

// Calendar items: event-like objects the calendar views can draw. Only bookings still to come or running today
// and later are useful there, but past ones are kept so the month view isn't missing days the person worked.
export function outsideCalendarItems(businesses) {
  const items = [];
  for (const b of businesses || []) {
    for (const g of b.groups || []) {
      if (!g.dates?.length || g.event_status === "cancelled") continue;
      items.push({
        id: `outside:${b.workspace?.id}:${g.id}`,
        title: g.event_title || "Booking",
        venue: g.venue || "",
        event_dates: g.dates,
        start_date: g.dates[0],
        end_date: g.dates[g.dates.length - 1],
        status: (g.last_day || g.dates[g.dates.length - 1]) < todayLocal() ? "completed" : "upcoming",
        __outside: { business: b.workspace?.name || "", roles: g.lines.map((l) => l.role_name).filter(Boolean) },
      });
    }
  }
  return items;
}

// Days this person is booked by other businesses: { "2026-12-11": [{ business, title, roles }] }. Used to warn about
// a clash when they plan their own work on one of those days.
export function outsideBookedDays(businesses) {
  const map = {};
  const today = todayLocal();
  for (const b of businesses || []) {
    for (const g of b.groups || []) {
      if (g.event_status === "cancelled") continue;
      for (const d of g.dates || []) {
        if (d < today) continue;
        (map[d] ||= []).push({ business: b.workspace?.name || "", title: g.event_title || "Booking", roles: g.lines.map((l) => l.role_name).filter(Boolean) });
      }
    }
  }
  return map;
}

// The "Work from others" menu item shows only for someone a business has invited (accepted, waiting or hidden).
export function useShowOutsideWorkNav() {
  const { data: work } = useOutsideWork();
  const { data: invites } = useMemberAppInvites();
  return (work?.length || 0) > 0 || (invites?.length || 0) > 0;
}
