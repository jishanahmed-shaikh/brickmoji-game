// Type-checks, bundles src/main.ts -> dist/main.js, and copies the static shell.
// Run with --watch for esbuild watch mode (no type-check, for fast iteration).
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');

if (!watch) {
  console.log('[build] type-checking...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
}

const opts = {
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: false,
  sourcemap: false,
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('[build] watching...');
} else {
  await esbuild.build(opts);
  const bytes = readFileSync('dist/main.js', 'utf8').length;
  console.log(`[build] done -> dist/main.js (${(bytes / 1024).toFixed(1)} KB)`);
}
