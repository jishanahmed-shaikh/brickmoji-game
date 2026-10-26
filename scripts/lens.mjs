// Packages dist/ as a Snapchat Web Lens and checks it against the platform's
// requirements (developers.snap.com/web-lenses/requirements). Run after
// `npm run build`:
//
//   npm run lens            -> brickmoji-lens-v1.zip
//   npm run lens -- 3       -> brickmoji-lens-v3.zip   (each upload is a version)
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = 'dist';
const STAGE = 'dist-lens';
const version = process.argv[2] ?? '1';
const ZIP = `brickmoji-lens-v${version}.zip`;
const MAX_ZIP = 8_000_000;
const MAX_INDEX = 1_000_000;

if (!existsSync(`${SRC}/index.html`)) {
  console.error(`No ${SRC}/index.html — run "npm run build" first.`);
  process.exit(1);
}

rmSync(STAGE, { recursive: true, force: true });
cpSync(SRC, STAGE, { recursive: true });

// Snapchat's Web Lens API (leaderboard, Bitmoji), shipped only in the Lens —
// the plain build stays free of anything that talks to a host.
const SNAP_API = 'node_modules/@snap/web-lens-api';
mkdirSync(join(STAGE, 'vendor'), { recursive: true });
cpSync(`${SNAP_API}/dist/snap-api.js`, join(STAGE, 'vendor', 'snap-api.js'));
cpSync(`${SNAP_API}/LICENSE`, join(STAGE, 'vendor', 'snap-api.LICENSE'));
const stagedHtml = join(STAGE, 'index.html');
writeFileSync(
  stagedHtml,
  readFileSync(stagedHtml, 'utf8').replace(
    '<script src="main.js"></script>',
    '<!-- Snapchat Web Lens API (MIT, Snap Inc.), Lens build only. -->\n    <script src="vendor/snap-api.js"></script>\n    <script src="main.js"></script>',
  ),
);

// `zip` first; then bsdtar (bundled in Windows 10+, writes proper "/" paths);
// Compress-Archive is the last resort.
function makeZip(outDir, zipPath) {
  const dst = resolve(zipPath).replace(/\\/g, '/');
  const attempts = [
    { name: 'zip', cmd: `cd "${outDir}" && zip -r -q -X -9 "${dst}" .` },
    {
      name: 'bsdtar',
      cmd:
        process.platform === 'win32'
          ? `cd "${outDir}" && "%SystemRoot%\\System32\\tar.exe" -a -c -f "${dst}" -- *`
          : `cd "${outDir}" && tar -a -c -f "${dst}" -- *`,
    },
    {
      name: 'Compress-Archive',
      cmd:
        `powershell -NoProfile -Command "Compress-Archive -Path '${resolve(outDir)}\\*' ` +
        `-DestinationPath '${resolve(zipPath)}' -Force"`,
    },
  ];
  for (const a of attempts) {
    rmSync(zipPath, { force: true });
    try {
      execSync(a.cmd, { stdio: 'pipe', shell: true });
      if (existsSync(zipPath) && statSync(zipPath).size > 0) return a.name;
    } catch {
      /* tool missing or failed — try the next one */
    }
  }
  throw new Error('could not create the zip — install `zip`, or run on Windows 10+ (bsdtar)');
}

function zipEntries(zipPath) {
  try {
    return execSync(`unzip -Z1 "${zipPath}"`, { encoding: 'utf8' }).trim().split(/\r?\n/);
  } catch {
    const ps =
      `Add-Type -A System.IO.Compression.FileSystem; ` +
      `[IO.Compression.ZipFile]::OpenRead('${resolve(zipPath)}').Entries | ` +
      `ForEach-Object { $_.FullName }`;
    return execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .map((e) => e.replace(/\\/g, '/'));
  }
}

const zipTool = makeZip(STAGE, ZIP);

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const entries = zipEntries(ZIP);
const html = readFileSync(join(STAGE, 'index.html'), 'utf8');
const zipBytes = statSync(ZIP).size;
const mb = (n) => `${(n / 1_000_000).toFixed(2)} MB`;

console.log(`\nChecking ${ZIP} against the Web Lens requirements:\n`);
check('index.html at the root of the zip', entries.includes('index.html'));
check('every entry uses forward slashes', entries.every((e) => !e.includes('\\')));
check('zip is 8 MB or smaller', zipBytes <= MAX_ZIP, mb(zipBytes));
check('index.html is 1 MB or smaller', Buffer.byteLength(html) <= MAX_INDEX, mb(Buffer.byteLength(html)));
check('no absolute paths in index.html', !/(?:src|href)\s*=\s*["']\//.test(html));
check('no external URLs in index.html', !/(?:src|href)\s*=\s*["'](https?:)?\/\//i.test(html));
check('no <base> element', !/<base[\s>]/i.test(html));
check('viewport-fit=cover (safe-area insets read as 0 without it)', /viewport-fit=cover/.test(html));
check('no source maps shipped', entries.every((e) => !e.endsWith('.map')));
check('Web Lens API is in the zip and loaded first', entries.includes('vendor/snap-api.js') && html.indexOf('vendor/snap-api.js') < html.indexOf('main.js'));

const big = entries
  .filter((e) => !e.endsWith('/'))
  .map((e) => [e, statSync(join(STAGE, e)).size])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
console.log('\nLargest files (uncompressed):');
for (const [e, n] of big) console.log(`  ${mb(n).padStart(9)}  ${e}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed. Fix them before uploading to My Lenses.`);
  process.exit(1);
}
console.log(`\n${ZIP} is ready (${mb(zipBytes)}, archived with ${zipTool}). Upload it at My Lenses as a Web Lens.`);
