/**
 * CORS for browser → Edge Function (Supabase JS client).
 * Aligned with @supabase/supabase-js/cors: methods + default allow-headers.
 * Echoes Access-Control-Request-Headers when present so new SDK headers never break preflight.
 */
const BASE: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function corsHeadersFor(req: Request): Record<string, string> {
  const requested = req.headers.get('Access-Control-Request-Headers');
  if (requested?.trim()) {
    return {
      ...BASE,
      'Access-Control-Allow-Headers': requested.trim(),
    };
  }
  return { ...BASE };
}
