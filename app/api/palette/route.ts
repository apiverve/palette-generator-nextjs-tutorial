import { callApi, fail, fromCache, guard, respond, toCache } from '@/lib/apiverve';

// The same color, scheme and variation always give the same palette, so answers are cached for a day.
// The order matters: answer from the cache first (free, no rate limit), then guard, then spend credits.
const TTL_MS = 24 * 60 * 60_000;
const SCHEMES = ['mono', 'contrast', 'triade', 'tetrade', 'analogic'];
const VARIATIONS = ['default', 'soft', 'pastel', 'light', 'hard', 'pale'];

/** GET /api/palette?color=2A9D8F&scheme=triade&variation=soft: a palette from Color Palette Generator. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const color = (params.get('color') || '').replace('#', '').toUpperCase();
  const scheme = params.get('scheme') || 'triade';
  const variation = params.get('variation') || 'default';
  if (!/^[0-9A-F]{6}$/.test(color)) return fail('Pick a color as a 6-digit hex code, like 2A9D8F');
  if (!SCHEMES.includes(scheme)) return fail(`Scheme must be one of: ${SCHEMES.join(', ')}`);
  if (!VARIATIONS.includes(variation)) return fail(`Variation must be one of: ${VARIATIONS.join(', ')}`);

  const key = `palette:${color}:${scheme}:${variation}`;
  const hit = fromCache(key, TTL_MS);
  if (hit) return Response.json(hit);

  const blocked = guard(request);
  if (blocked) return blocked;

  return respond(async () => {
    const data = await callApi('colorpalette', { query: { color, scheme, variation } });
    toCache(key, data);
    return data;
  });
}
