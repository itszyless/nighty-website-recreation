import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['home', 'commands', 'get-links', 'terms-of-service', '404'];
const required = new Set();
for (const name of pages) {
  const html = await readFile(path.join(root, 'pages', `${name}.html`), 'utf8');
  assert(html.includes('<html') && html.includes('</html>'), `${name}: incomplete HTML`);
  assert(html.includes('/local-runtime.js'), `${name}: missing local navigation`);
  assert(!html.includes('static.cloudflareinsights.com'), `${name}: analytics still present`);
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+)/g)) required.add(match[1]);
  for (const match of html.matchAll(/url=%2Fassets[^&" ]+/g)) required.add(decodeURIComponent(match[0].slice(4)));
}
for (const file of required) assert((await stat(path.join(root, 'public', file))).isFile(), `Missing asset: ${file}`);
const commands = JSON.parse(await readFile(path.join(root, 'data', 'commands.json'), 'utf8'));
assert(commands && typeof commands === 'object', 'Invalid command catalog');
assert(JSON.stringify(commands).includes('autotranslate'), 'Command catalog is incomplete');
let assetCount = 0;
async function countFiles(dir) { for (const file of await readdir(dir, { withFileTypes: true })) file.isDirectory() ? await countFiles(path.join(dir, file.name)) : assetCount++; }
await countFiles(path.join(root, 'public'));
console.log(`Checked ${pages.length} page snapshots, ${required.size} referenced assets, ${assetCount} saved files and command data.`);
