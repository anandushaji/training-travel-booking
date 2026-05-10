// ─── In-memory metric stores ──────────────────────────────────────────────

interface Counter {
  name: string;
  labels: Record<string, string>;
  value: number;
}

interface Histogram {
  name: string;
  labels: Record<string, string>;
  observations: number[];
}

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();

function counterKey(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `${name}{${labelStr}}`;
}

export function incrementCounter(name: string, labels: Record<string, string> = {}): void {
  const key = counterKey(name, labels);
  const existing = counters.get(key);
  if (existing) {
    existing.value += 1;
  } else {
    counters.set(key, { name, labels, value: 1 });
  }
}

export function recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = counterKey(name, labels);
  const existing = histograms.get(key);
  if (existing) {
    existing.observations.push(value);
  } else {
    histograms.set(key, { name, labels, observations: [value] });
  }
}

export function getCounter(name: string, labels: Record<string, string> = {}): number {
  return counters.get(counterKey(name, labels))?.value ?? 0;
}

export function getHistogramObservations(name: string, labels: Record<string, string> = {}): number[] {
  return histograms.get(counterKey(name, labels))?.observations ?? [];
}

// ─── Metric names ─────────────────────────────────────────────────────────

export const METRIC_NAMES = {
  API_REQUESTS_TOTAL: 'frontend_api_requests_total',
  API_RETRY_TOTAL: 'frontend_api_retry_total',
  API_REQUEST_DURATION_MS: 'frontend_api_request_duration_ms',
  CACHE_HIT_TOTAL: 'frontend_cache_hit_total',
  CACHE_MISS_TOTAL: 'frontend_cache_miss_total',
} as const;

// ─── Flush to metrics endpoint ────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 30_000;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function buildPayload() {
  return {
    counters: [...counters.values()],
    histograms: [...histograms.values()].map((h) => ({
      name: h.name,
      labels: h.labels,
      count: h.observations.length,
      sum: h.observations.reduce((s, v) => s + v, 0),
      p50: percentile(h.observations, 0.5),
      p95: percentile(h.observations, 0.95),
      p99: percentile(h.observations, 0.99),
    })),
    timestamp: new Date().toISOString(),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const copy = [...sorted].sort((a, b) => a - b);
  const idx = Math.floor(copy.length * p);
  return copy[Math.min(idx, copy.length - 1)] ?? 0;
}

function flush(): void {
  const endpoint =
    typeof window !== 'undefined'
      ? (window as Window & { __ENV__?: { METRICS_ENDPOINT?: string } }).__ENV__
          ?.METRICS_ENDPOINT
      : undefined;

  const payload = buildPayload();

  if (endpoint) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Best-effort — silently ignore flush failures
    });
  } else {
    console.debug('[metrics]', payload);
  }
}

export function startMetricsFlusher(): void {
  if (flushTimer !== null) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export function stopMetricsFlusher(): void {
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ─── Reset (test utility) ─────────────────────────────────────────────────

export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
}
