import { Hono } from 'hono';
import type { Env } from '../types/env';
import { parseDomainRow, type DomainRowRaw, type DomainRow } from '../types/domain';

export const blueprintRoute = new Hono<{ Bindings: Env }>();

/**
 * Escape a string for safe interpolation into HTML text/attribute contexts.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a complete, SEO-optimized static HTML asset page for the domain.
 */
function renderBlueprint(domain: DomainRow): string {
  const name = escapeHtml(domain.domain_name);
  const title = `${name} | Authority Domain`;
  const canonical = `https://${name}/`;
  const description = `${name} is an established authority domain backed by ${domain.backlink_count.toLocaleString()} backlinks and a domain authority score of ${domain.da_score}, including links from high-authority sources.`;

  const authorityLinks = domain.source_authority_links;
  const authoritySection =
    authorityLinks.length > 0
      ? `
      <section class="authority">
        <h2>Authority Backlink Sources</h2>
        <p>This domain is referenced by ${authorityLinks.length} authoritative source${authorityLinks.length === 1 ? '' : 's'}:</p>
        <ul>
          ${authorityLinks.map((link) => `<li>${escapeHtml(link)}</li>`).join('\n          ')}
        </ul>
      </section>`
      : `
      <section class="authority">
        <h2>Backlink Profile</h2>
        <p>This domain carries an organically developed backlink profile totalling ${domain.backlink_count.toLocaleString()} links.</p>
      </section>`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: canonical,
    description: `${name} — authority domain with ${domain.backlink_count} backlinks and DA ${domain.da_score}, supported by high-authority backlink sources.`,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(canonical)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:site_name" content="${name}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />

  <script type="application/ld+json">${jsonLd}</script>

  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .wrap { max-width: 820px; margin: 0 auto; padding: 4rem 1.5rem; }
    header h1 { font-size: 2.5rem; margin: 0 0 0.5rem; color: #f8fafc; word-break: break-word; }
    .meta { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 1.5rem 0; }
    .stat { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem 1.25rem; }
    .stat .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .stat .value { font-size: 1.5rem; font-weight: 700; color: #34d399; }
    section { margin-top: 2.5rem; }
    h2 { color: #f1f5f9; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.35rem 0; color: #cbd5e1; }
    .cta { margin-top: 3rem; background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; border-radius: 1rem; padding: 2rem; text-align: center; }
    .cta a { display: inline-block; margin-top: 1rem; background: #10b981; color: #022c22; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; }
    footer { margin-top: 3rem; font-size: 0.8rem; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${name}</h1>
      <p>Established authority domain available for strategic acquisition.</p>
      <div class="meta">
        <div class="stat"><div class="label">Domain Authority</div><div class="value">${domain.da_score}</div></div>
        <div class="stat"><div class="label">Backlinks</div><div class="value">${domain.backlink_count.toLocaleString()}</div></div>
        <div class="stat"><div class="label">Authority Sources</div><div class="value">${authorityLinks.length}</div></div>
      </div>
    </header>
    ${authoritySection}
    <section class="cta">
      <h2>Acquire This Authority Asset</h2>
      <p>Leverage an existing high-authority backlink profile to accelerate your search rankings.</p>
      <a href="mailto:acquisitions@${name}">Enquire About ${name}</a>
    </section>
    <footer>Generated by Drop Catch Engine · ${escapeHtml(canonical)}</footer>
  </div>
</body>
</html>`;
}

/**
 * GET /api/blueprint/:id — serve the static SEO asset page for a domain.
 */
blueprintRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const raw = await c.env.DB.prepare(`SELECT * FROM domains WHERE id = ?`)
    .bind(id)
    .first<DomainRowRaw>();

  if (!raw) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  const html = renderBlueprint(parseDomainRow(raw));
  return c.body(html, 200, {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
  });
});
