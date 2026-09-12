#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const manifest = JSON.parse(await readFile(resolve(root, 'cube-static-assets.json'), 'utf8'));
await Promise.all(Object.entries(manifest.files).map(async ([source, record]) => {
  const response = await fetch(`${manifest.baseUrl}/${record.object}`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${source}: CDN returned HTTP ${response.status}`);
  const content = Buffer.from(await response.arrayBuffer());
  if (content.length !== record.size || createHash('sha256').update(content).digest('hex') !== record.sha256) throw new Error(`${source}: content does not match manifest`);
  const destination = resolve(root, '.static-assets/font', source.slice('/font/'.length));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}));
console.log(`Restored ${manifest.fileCount} Cube3DText fonts`);
