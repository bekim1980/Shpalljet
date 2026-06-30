// Lightweight, dependency-free analytics helper.
// - No network calls (pluggable later via window.dataLayer or Supabase)
// - Built-in dedupe via a per-session Set so the same event for the same id
//   doesn't fire twice in a short window
// - Safe in SSR (guards window/sessionStorage)

export type AnalyticsEvent =
  | "card_click"
  | "card_view"
  | "message_sent"
  | "message_sent_success"
  | "boost_click"
  | "boost_confirm"
  | "favorite_toggle"
  | "search_save"
  | "back_to_top"
  | "insight_click"
  | "insight_action_click"
  | "job_apply_click";

interface TrackOptions {
  /** Dedupe key — event won't refire with same key in the current session. */
  dedupeKey?: string;
  /** Arbitrary payload (id, source, value...). */
  props?: Record<string, unknown>;
}

const seen = new Set<string>();

const isBrowser = typeof window !== "undefined";

// Lightweight in-memory event log so the Insights page can show counts.
// Persisted to sessionStorage so a route change doesn't wipe history.
const STORAGE_KEY = "shpj_events_v1";
const MAX_EVENTS = 500;

interface RecordedEvent {
  event: AnalyticsEvent;
  ts: number;
  props: Record<string, unknown>;
}

const loadEvents = (): RecordedEvent[] => {
  if (!isBrowser) return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecordedEvent[]) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: RecordedEvent[]) => {
  if (!isBrowser) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    /* quota exceeded — ignore */
  }
};

export const getRecordedEvents = (): RecordedEvent[] => loadEvents();

const pushToDataLayer = (event: AnalyticsEvent, payload: Record<string, unknown>) => {
  if (!isBrowser) return;
  // GA4 / GTM convention — harmless if dataLayer doesn't exist
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
  if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
  w.dataLayer.push({ event, ...payload, ts: Date.now() });
  // Local recorder for Insights
  const events = loadEvents();
  events.push({ event, ts: Date.now(), props: payload });
  saveEvents(events);
};

export const track = (event: AnalyticsEvent, opts: TrackOptions = {}): void => {
  const key = opts.dedupeKey ? `${event}:${opts.dedupeKey}` : null;
  if (key) {
    if (seen.has(key)) return;
    seen.add(key);
  }
  pushToDataLayer(event, opts.props ?? {});
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, opts.props ?? {});
  }
};

/** Reset dedupe cache (useful in tests). */
export const __resetAnalytics = () => {
  seen.clear();
  if (isBrowser) sessionStorage.removeItem(STORAGE_KEY);
};
