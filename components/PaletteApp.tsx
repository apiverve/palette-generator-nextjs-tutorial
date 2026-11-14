'use client';

import { useEffect, useState } from 'react';

type Swatch = { hex: string; name: string; rgb: { r: number; g: number; b: number }; isDark: boolean; textColor: string };
type Palette = { source: string; sourceName: string; scheme: string; variation: string; colorPalette: Swatch[] };
type Result = Palette & { error?: string; code?: string };
type Saved = { source: string; scheme: string; variation: string; hexes: string[] };

const SCHEMES = [
  { id: 'triade', label: 'Triad' },
  { id: 'analogic', label: 'Analogous' },
  { id: 'tetrade', label: 'Tetrad' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'mono', label: 'Mono' }
];
const VARIATIONS = ['default', 'soft', 'pastel', 'light', 'hard', 'pale'];
const SAVED_KEY = 'palettes:saved';

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function PaletteApp() {
  const [color, setColor] = useState('#264653');
  const [scheme, setScheme] = useState('tetrade');
  const [variation, setVariation] = useState('pastel');
  const [palette, setPalette] = useState<Palette | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);
  const [copied, setCopied] = useState('');
  const [saved, setSaved] = useState<Saved[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'));
    } catch {}
    const q = new URLSearchParams(location.search);
    const c = q.get('color');
    generate(c ? `#${c.replace('#', '')}` : color, q.get('scheme') || scheme, q.get('variation') || variation);
  }, []);

  async function generate(c: string, s: string, v: string) {
    setColor(c.toUpperCase());
    setScheme(s);
    setVariation(v);
    setLoading(true);
    setError('');
    const res = await fetch(`/api/palette?color=${encodeURIComponent(c.replace('#', ''))}&scheme=${s}&variation=${v}`);
    const data: Result = await res.json().catch(() => ({ error: 'Something went wrong' }) as Result);
    setLoading(false);
    if (data.code === 'missing_key') return setMissingKey(true);
    if (data.error) return setError(res.status === 429 ? 'Lots of palettes! Wait a minute and try again.' : data.error);
    setPalette(data);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1400);
    } catch {}
  }

  function save() {
    if (!palette) return;
    const entry = { source: palette.source, scheme, variation, hexes: palette.colorPalette.map((s) => s.hex) };
    const next = [entry, ...saved.filter((p) => p.hexes.join() !== entry.hexes.join())].slice(0, 12);
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {}
  }

  const css = palette ? `:root {\n${palette.colorPalette.map((s) => `  --${slug(s.name)}: ${s.hex};`).join('\n')}\n}` : '';

  if (missingKey) {
    return (
      <main className="page">
        <section className="setup">
          <p className="eyebrow">One step left</p>
          <h1>Add your API key</h1>
          <p>
            Palettes come from the APIVerve Color Palette Generator API. Create a free key at{' '}
            <a href="https://dashboard.apiverve.com/signup?api=colorpalette&utm_source=template&utm_medium=app&utm_campaign=palette-generator-nextjs-tutorial">dashboard.apiverve.com</a>, set{' '}
            <code>APIVERVE_API_KEY</code> in <code>.env</code> or in your Vercel project, and reload.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="bar">
        <h1 className="logo">
          <span className="dots" aria-hidden="true">
            {(palette?.colorPalette || []).slice(0, 4).map((s) => (
              <i key={s.hex} style={{ background: s.hex }} />
            ))}
          </span>
          Palette
        </h1>

        <div className="controls">
          <label className="pick">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} onBlur={() => generate(color, scheme, variation)} aria-label="Base color" />
            <input
              className="hex"
              value={color}
              maxLength={7}
              onChange={(e) => setColor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate(color, scheme, variation)}
              aria-label="Hex code"
            />
          </label>
          <div className="seg" role="group" aria-label="Scheme">
            {SCHEMES.map((s) => (
              <button key={s.id} className={scheme === s.id ? 'on' : ''} onClick={() => generate(color, s.id, variation)}>
                {s.label}
              </button>
            ))}
          </div>
          <select value={variation} onChange={(e) => generate(color, scheme, e.target.value)} aria-label="Variation">
            {VARIATIONS.map((v) => (
              <option key={v} value={v}>{v === 'default' ? 'Balanced' : v[0].toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
          <button className="go" onClick={() => generate(color, scheme, variation)} disabled={loading}>
            {loading ? '…' : 'Generate'}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {palette && (
        <>
          <p className="caption">
            From <b>{palette.sourceName}</b> <code>{palette.source}</code>
          </p>
          <section className="swatches" aria-live="polite">
            {palette.colorPalette.map((s) => (
              <button key={s.hex} className="swatch" style={{ background: s.hex, color: s.textColor }} onClick={() => copy(s.hex, s.hex)} title="Copy hex">
                <span className="name">{s.name}</span>
                <span className="hexcode">{copied === s.hex ? 'Copied' : s.hex}</span>
                <span className="rgb">
                  rgb({s.rgb.r}, {s.rgb.g}, {s.rgb.b})
                </span>
              </button>
            ))}
          </section>

          <div className="lower">
            <section className="panel">
              <div className="panel-head">
                <h2>CSS variables</h2>
                <div>
                  <button onClick={() => copy(css, 'css')}>{copied === 'css' ? 'Copied' : 'Copy CSS'}</button>
                  <button onClick={save}>Save palette</button>
                </div>
              </div>
              <pre>{css}</pre>
            </section>
            <section className="panel">
              <h2>Saved</h2>
              {saved.length === 0 ? (
                <p className="muted">Palettes you save stay here, on this device.</p>
              ) : (
                <ul className="saved">
                  {saved.map((p) => (
                    <li key={p.hexes.join()}>
                      <button onClick={() => generate(p.source, p.scheme, p.variation)} aria-label={`Open palette from ${p.source}`}>
                        {p.hexes.map((h) => (
                          <i key={h} style={{ background: h }} />
                        ))}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <p className="foot">
        Palettes by the <a href="https://apiverve.com/marketplace/colorpalette?utm_source=template&utm_medium=app&utm_campaign=palette-generator-nextjs-tutorial">APIVerve Color Palette Generator API</a>
      </p>
    </main>
  );
}
