export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cross-Origin-Resource-Policy': 'same-site',
} as const;

export interface D1Statement<TFirst = unknown> {
  bind: (...args: unknown[]) => D1Statement<TFirst>;
  first: () => Promise<TFirst | null>;
  run: () => Promise<unknown>;
  all: () => Promise<{ results: TFirst[] }>;
}

export interface D1DatabaseLike {
  prepare: <TFirst = unknown>(query: string) => D1Statement<TFirst>;
}

const DEFAULT_RATE_POLICIES = {
  'astrologo/calcular': { enabled: 1, max_requests: 10, window_minutes: 10 },
  'astrologo/analisar': { enabled: 1, max_requests: 6, window_minutes: 15 },
  'astrologo/enviar-email': { enabled: 1, max_requests: 4, window_minutes: 60 },
  'astrologo/contato': { enabled: 1, max_requests: 5, window_minutes: 30 },
  'astrologo/auth': { enabled: 1, max_requests: 8, window_minutes: 15 },
  'astrologo/transitos': { enabled: 1, max_requests: 6, window_minutes: 15 },
  'astrologo/sinastria': { enabled: 1, max_requests: 4, window_minutes: 15 },
  'astrologo/localidade': { enabled: 1, max_requests: 4, window_minutes: 30 },
} as const;

export const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders,
      ...extraHeaders,
    },
  });

export const isAllowedLcvOrigin = (origin: string): boolean => /^https:\/\/([a-z0-9-]+\.)*lcv\.app\.br$/i.test(origin);

export const getCorsHeaders = (
  request: Request,
  fallbackOrigin: string,
  methods = 'POST, OPTIONS',
): Record<string, string> => {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = isAllowedLcvOrigin(origin) ? origin : fallbackOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
  };
};

export const hasDisallowedOrigin = (request: Request): boolean => {
  const origin = request.headers.get('Origin')?.trim();
  return !origin || !isAllowedLcvOrigin(origin);
};

export const getClientIp = (request: Request): string => {
  const cfIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;

  return 'unknown';
};

async function getRateLimitPolicy(db: D1DatabaseLike, route: keyof typeof DEFAULT_RATE_POLICIES) {
  const fallback = DEFAULT_RATE_POLICIES[route];
  const row = await db
    .prepare<{ enabled?: number; max_requests?: number; window_minutes?: number }>(`
    SELECT enabled, max_requests, window_minutes
    FROM astrologo_rate_limit_policies
    WHERE route = ?
    LIMIT 1
  `)
    .bind(route)
    .first();

  return {
    enabled: Number.parseInt(String(row?.enabled ?? fallback.enabled), 10) === 1,
    maxRequests: Math.max(1, Number.parseInt(String(row?.max_requests ?? fallback.max_requests), 10)),
    windowMinutes: Math.max(1, Number.parseInt(String(row?.window_minutes ?? fallback.window_minutes), 10)),
  };
}

export async function enforceRateLimit(
  db: D1DatabaseLike,
  request: Request,
  route: keyof typeof DEFAULT_RATE_POLICIES,
) {
  const policy = await getRateLimitPolicy(db, route);
  if (!policy.enabled) return null;

  const ip = getClientIp(request);
  const bucketSize = policy.windowMinutes * 60 * 1000;
  const windowStart = Math.floor(Date.now() / bucketSize) * bucketSize;
  const key = `${route}:${ip}:${windowStart}`;

  const row = await db
    .prepare<{ request_count?: number }>(`
    SELECT request_count
    FROM astrologo_api_rate_limits
    WHERE key = ?
    LIMIT 1
  `)
    .bind(key)
    .first();

  const currentCount = Number.parseInt(String(row?.request_count ?? 0), 10) || 0;
  if (currentCount >= policy.maxRequests) {
    return jsonResponse(
      { success: false, error: 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.' },
      429,
      { 'Retry-After': String(policy.windowMinutes * 60) },
    );
  }

  await db
    .prepare(`
    INSERT INTO astrologo_api_rate_limits (key, route, window_start, request_count, updated_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      request_count = request_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(key, route, windowStart)
    .run();

  return null;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((chunk) => chunk.toString(16).padStart(2, '0'))
    .join('');
}
