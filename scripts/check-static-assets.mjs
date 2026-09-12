import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const manifest = JSON.parse(await readFile(new URL('../cube-static-assets.json', import.meta.url), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.bucket !== 'ec-static-assets' || manifest.region !== 'cn-hangzhou' || manifest.objectPrefix !== 'cube-3d-text/fonts' || manifest.baseUrl !== 'https://static.easecation.net/cube-3d-text/fonts') throw new Error('Cube3DText static asset target is invalid');
try { await stat(resolve('public/font')); throw new Error('public/font must remain externalized'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const entries = Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b));
const treeHash = createHash('sha256');
let totalBytes = 0;
for (const [source, file] of entries) {
  if (!/^\/font\/[A-Za-z0-9._-]+\.json$/.test(source)) throw new Error(`Unexpected font path: ${source}`);
  const extension = extname(source).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(file.sha256) || file.object !== `objects/${file.sha256}${extension}` || !Number.isSafeInteger(file.size) || file.size < 1) throw new Error(`Invalid font object: ${source}`);
  totalBytes += file.size;
  treeHash.update(`${source}\0${file.sha256}\0${file.size}\n`);
}
if (entries.length !== manifest.fileCount || totalBytes !== manifest.totalBytes || treeHash.digest('hex') !== manifest.treeSha256) throw new Error('Cube3DText manifest summary is invalid');
if (process.argv.includes('--remote')) {
  const response = await fetch(`${manifest.baseUrl}/manifests/${manifest.treeSha256}.json`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok || JSON.stringify(await response.json()) !== JSON.stringify(manifest)) throw new Error('Published Cube3DText manifest does not match Git');
}
console.log(`Cube3DText static assets passed (${manifest.fileCount} files, ${manifest.totalBytes} bytes)`);
