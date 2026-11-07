#!/usr/bin/env node
// Reads `npm audit --json` on stdin, then does two things:
//
// 1. BLOCK: fails the push on any high or critical advisory whose
//    GHSA-id is NOT listed in the allowlist file (argv[2]).
//
// 2. NUDGE: for any `watch:` line in the allowlist, queries npm for
//    the package's current `latest` version. If it now meets the
//    minimum-safe version, prints a friendly reminder that the
//    deferred CVEs on that package are ready to be resolved. Result
//    is cached in .githooks/.upgrade-check-cache.json (24h TTL) so
//    the network call doesn't run on every push.
//
// Design note: `npm audit --json` only reports advisories on the leaf
// vulnerable package (postcss, sharp, ...). Parent packages that show
// as high (e.g. next, eslint-config-next) do so because they depend
// on those leaves — their `via` field is a list of parent-package
// name strings, not advisory objects. So we only inspect object-type
// `via` entries; allowlisting the leaf GHSA clears the parent too.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// The allowlist path is the first non-flag arg. --ci suppresses the
// interactive upgrade-availability check (a `npm view` network call
// per watched package) since CI runs are non-interactive and the
// daily monitoring workflow already handles that reminder loop.
const args = process.argv.slice(2);
const CI_MODE = args.includes('--ci');
const allowlistPath = args.find((a) => !a.startsWith('--'));

const allowed = new Set();
const watches = []; // [{ pkg, minVersion }]
if (allowlistPath && fs.existsSync(allowlistPath)) {
  for (const raw of fs.readFileSync(allowlistPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] === 'watch:' && parts.length >= 3) {
      watches.push({ pkg: parts[1], minVersion: parts[2] });
      continue;
    }
    if (parts[0].startsWith('GHSA-')) allowed.add(parts[0]);
  }
}

function semverCompare(a, b) {
  // Compare "major.minor.patch" ignoring pre-release suffixes.
  // Good enough for stable-release comparisons; we don't want a
  // preview.9 to satisfy a "16.3.0" watch — pre-releases are
  // deliberately unsatisfying here.
  const parse = (v) => {
    const stable = v.split('-')[0];
    return stable.split('.').map((p) => parseInt(p, 10) || 0);
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return Math.sign(diff);
  }
  // If versions are equal on stable parts, a pre-release (has '-')
  // is LESS than the stable form — so preview.9 does NOT satisfy 16.3.0.
  const aPre = a.includes('-');
  const bPre = b.includes('-');
  if (aPre && !bPre) return -1;
  if (!aPre && bPre) return 1;
  return 0;
}

function checkUpgradeAvailability() {
  if (watches.length === 0) return [];

  const cachePath = path.join(path.dirname(allowlistPath), '.upgrade-check-cache.json');
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch {}

  const ready = [];
  let cacheChanged = false;

  for (const { pkg, minVersion } of watches) {
    const cached = cache[pkg];
    let latest;
    if (cached && cached.checkedAt && now - cached.checkedAt < CACHE_TTL_MS) {
      latest = cached.latest;
    } else {
      try {
        latest = execSync(`npm view ${pkg} version`, { encoding: 'utf8', timeout: 8000 }).trim();
        cache[pkg] = { latest, checkedAt: now };
        cacheChanged = true;
      } catch {
        // Offline or npm registry hiccup — skip silently so we don't
        // slow down or spam the push over a network blip.
        continue;
      }
    }
    if (semverCompare(latest, minVersion) >= 0) {
      ready.push({ pkg, latest, minVersion });
    }
  }

  if (cacheChanged) {
    try {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    } catch {}
  }

  return ready;
}

let stdin = '';
process.stdin.on('data', (chunk) => {
  stdin += chunk;
});
process.stdin.on('end', () => {
  if (!stdin.trim()) {
    console.log('⚠️  npm audit produced no output — skipping check.');
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(stdin);
  } catch {
    console.log('⚠️  Could not parse npm audit JSON — skipping check.');
    process.exit(0);
  }

  const vulns = data.vulnerabilities || {};
  const blockers = [];
  for (const [pkg, entry] of Object.entries(vulns)) {
    for (const via of entry.via || []) {
      if (typeof via !== 'object' || !via.url) continue;
      if (via.severity !== 'high' && via.severity !== 'critical') continue;
      const match = via.url.match(/GHSA-[a-z0-9-]+/i);
      if (match && !allowed.has(match[0])) {
        blockers.push({ pkg, id: match[0], sev: via.severity, title: via.title || '' });
      }
    }
  }

  if (blockers.length > 0) {
    console.log('');
    console.log(
      `❌ Push blocked: ${blockers.length} unallowlisted high/critical npm vulnerabilit${blockers.length === 1 ? 'y' : 'ies'}:`
    );
    for (const b of blockers) {
      console.log(`   ${b.pkg} → ${b.id} (${b.sev}): ${b.title.slice(0, 80)}`);
    }
    console.log('');
    console.log(`   To defer: add the GHSA-id to ${allowlistPath}`);
    console.log('   (WITH a rationale entry in docs/fixes.md so it does not rot).');
    console.log("   To resolve: run 'npm audit fix'.");
    console.log("   Use 'git push --no-verify' only in a genuine emergency.");
    process.exit(1);
  }

  if (allowed.size > 0) {
    console.log(
      `✅ Audit passed (${allowed.size} advisor${allowed.size === 1 ? 'y' : 'ies'} allowlisted).`
    );
  } else {
    console.log('✅ Audit passed.');
  }

  // The push is going through. Piggy-back a check for whether any
  // deferred upgrades have become available since last time — nudge
  // the user so the allowlist doesn't rot. Skipped in --ci mode:
  // CI is non-interactive and the daily security-audit workflow
  // already surfaces upgrade availability via GitHub issues.
  const ready = CI_MODE ? [] : checkUpgradeAvailability();
  if (ready.length > 0) {
    console.log('');
    console.log('🎉 Deferred upgrades are ready — the CVE window can close:');
    for (const u of ready) {
      console.log(`   ${u.pkg}: latest is ${u.latest} (you were waiting for ≥ ${u.minVersion})`);
    }
    console.log('');
    console.log('   Next steps:');
    console.log(`     1. npm install ${ready.map((u) => u.pkg + '@latest').join(' ')}`);
    console.log('     2. Verify the app still builds and behaves (npm run build, smoke test)');
    console.log(`     3. Remove the resolved GHSAs from ${allowlistPath}`);
    console.log('     4. Remove the matching entry from docs/fixes.md');
    console.log('   The push has already been sent — this is a heads-up, not a block.');
    console.log('');
  }

  process.exit(0);
});
