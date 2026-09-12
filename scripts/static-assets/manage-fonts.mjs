#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFile, link, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..', '..');
const manifestPath = join(root, 'cube-static-assets.json');
const sourceFlag = process.argv.indexOf('--source');
if (sourceFlag < 0 || !process.argv[sourceFlag + 1]) throw new Error('Usage: manage-fonts.mjs --source <font directory> [--write] [--publish]');
const sourceRoot = resolve(process.argv[sourceFlag + 1]);
const sourceFiles = (await readdir(sourceRoot, { withFileTypes: true })).map((entry) => {
  if (!entry.isFile()) throw new Error(`Unsupported font entry: ${entry.name}`);
  return join(sourceRoot, entry.name);
}).sort();

const files = {};
const treeHash = createHash('sha256');
let totalBytes = 0;
for (const file of sourceFiles) {
  const content = await readFile(file);
  const source = '/font/' + relative(sourceRoot, file).split(sep).join('/');
  const sha256 = createHash('sha256').update(content).digest('hex');
  const size = content.length;
  files[source] = { object: `objects/${sha256}${extname(file).toLowerCase()}`, size, sha256 };
  totalBytes += size;
  treeHash.update(`${source}\0${sha256}\0${size}\n`);
}
const treeSha256 = treeHash.digest('hex');
const manifest = { schemaVersion: 1, bucket: 'ec-static-assets', region: 'cn-hangzhou', objectPrefix: 'cube-3d-text/fonts', baseUrl: 'https://static.easecation.net/cube-3d-text/fonts', fileCount: sourceFiles.length, totalBytes, treeSha256, files };
if (process.argv.includes('--write')) await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

if (process.argv.includes('--publish')) {
  const stage = await mkdtemp(join(tmpdir(), 'ec-cube-fonts-'));
  try {
    for (const [source, record] of Object.entries(files)) {
      const destination = join(stage, record.object);
      await mkdir(resolve(destination, '..'), { recursive: true });
      try { await link(join(sourceRoot, source.slice('/font/'.length)), destination); }
      catch (error) { if (error.code === 'EXDEV') await copyFile(join(sourceRoot, source.slice('/font/'.length)), destination); else if (error.code !== 'EEXIST') throw error; }
    }
    const run = (args) => {
      const result = spawnSync('aliyun', args, { cwd: root, stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`aliyun ${args.slice(0, 2).join(' ')} failed`);
    };
    run(['oss', 'cp', `${stage}${sep}`, `oss://${manifest.bucket}/${manifest.objectPrefix}/`, '--recursive', '--force', '--disable-dir-object', '--jobs', '8', '--region', manifest.region, '--meta', 'Cache-Control:public, max-age=31536000, immutable#Content-Type:application/json']);
    const remoteManifest = join(stage, 'manifest.json');
    await writeFile(remoteManifest, JSON.stringify(manifest, null, 2) + '\n');
    run(['oss', 'cp', remoteManifest, `oss://${manifest.bucket}/${manifest.objectPrefix}/manifests/${treeSha256}.json`, '--force', '--region', manifest.region, '--meta', 'Cache-Control:public, max-age=31536000, immutable#Content-Type:application/json']);
  } finally { await rm(stage, { recursive: true, force: true }); }
}
console.log(`Cube3DText fonts: ${sourceFiles.length} files, ${totalBytes} bytes, tree ${treeSha256}`);
