import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const [vercel, html, layout, css, gate] = await Promise.all([
  readFile(resolve(root, 'vercel.json'), 'utf8'),
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'src/components/Layout.tsx'), 'utf8'),
  readFile(resolve(root, 'src/index.css'), 'utf8'),
  readFile(resolve(root, 'public/store_gate_v1.0.js'), 'utf8'),
]);
const config = JSON.parse(vercel);
check(config.outputDirectory === 'dist', 'Vercel outputDirectory must remain dist.');
check(html.indexOf('<meta charset="UTF-8"') < html.indexOf('/store_gate_v1.0.js'), 'Store gate must load after charset.');
check(html.indexOf('/store_gate_v1.0.js') < html.indexOf('<title>'), 'Store gate must load before title.');
for (const option of ["mode: 'entry-gate'", "portalIds: ['appstore']", "silentPortalIds: ['library']", 'allowStandalone: true', 'autoRedirectSeconds: 0']) {
  check(html.includes(option), `Missing gate option: ${option}`);
}
check(layout.includes("getAppStoreUrl('skw-tracking-signs')"), 'Missing SG18 URL lookup.');
check(layout.includes('storeSupportTop') && layout.includes('hidden'), 'SG18 link must start hidden.');
check(css.includes('[hidden]') && css.includes('@media print'), 'Missing hidden/print CSS handling.');
check(!/supabase\.co|bump_hearts|bump_stars/.test(layout + html), 'Direct Supabase or counter call found in app integration.');
const gateStat = await stat(resolve(root, 'public/store_gate_v1.0.js'));
check(gateStat.size > 1000, 'Store gate asset is unexpectedly small.');

if (failures.length) {
  console.error(`PREFLIGHT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('PREFLIGHT PASS: Vercel output, entry-gate setup, SG18, hidden/print handling.');
}
