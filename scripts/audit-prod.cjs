#!/usr/bin/env node
/**
 * Production dependency audit for the release gate (`pnpm audit:prod`).
 *
 * Fails on any high or critical advisory in production dependencies, exactly like
 * `pnpm audit --prod --audit-level high`, except an advisory listed in ACCEPTED
 * below. The gate rule: an advisory with no patched release may be accepted by id,
 * in the repo audit config, with the reason recorded where it is set. An acceptance
 * is narrow and temporary:
 *   - it names the advisory id and the only dependency path it may arrive through;
 *     the same advisory reached any other way still fails;
 *   - it expires; after that date the gate fails again until it is reviewed;
 *   - once a patched version is published, the gate fails so the fix is taken;
 *   - if the audit output cannot be read, the gate fails.
 */
const { execFileSync } = require('node:child_process');

const ACCEPTED = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    package: 'picomatch',
    // Reached through the Sentry build-time webpack loader
    // (@sentry/nextjs > @rollup/plugin-commonjs > picomatch), which matches the
    // build glob patterns while `next build` runs. No request-time code loads it and
    // no visitor input reaches it. Every published picomatch (<= 4.0.7) is affected
    // and none is patched (checked 18 Nov 2026). Accepted by the owner on 18 Nov 2026.
    via: ['@sentry/nextjs', '@rollup/plugin-commonjs'],
    expires: '2026-12-17',
    reason: 'No patched picomatch exists; build-time-only path through the Sentry webpack loader.',
  },
];

const SEVERE = new Set(['high', 'critical']);
const NO_PATCH = new Set(['<0.0.0', '', undefined, null]);

/** ".>@sentry/nextjs>@rollup/plugin-commonjs>picomatch" -> ["@sentry/nextjs", "@rollup/plugin-commonjs"] */
function chainOf(path, name) {
  const parts = String(path || '').split('>').filter((part) => part && part !== '.');
  if (parts[parts.length - 1] === name) parts.pop();
  return parts;
}

function evaluateAudit(report, { today = new Date() } = {}) {
  const failures = [];
  const accepted = [];
  const advisories = report && typeof report === 'object' ? report.advisories : undefined;
  if (!advisories || typeof advisories !== 'object') {
    return { failures: ['the audit report could not be read; failing closed'], accepted };
  }
  for (const advisory of Object.values(advisories)) {
    if (!SEVERE.has(advisory.severity)) continue;
    const name = advisory.module_name;
    const id = advisory.github_advisory_id || String(advisory.url || '').split('/').pop();
    const rule = ACCEPTED.find((item) => item.id === id && item.package === name);
    if (!rule) {
      failures.push(`${name}: ${id} (${advisory.severity}) ${advisory.title || ''}`.trim());
      continue;
    }
    if (new Date(`${rule.expires}T23:59:59Z`) < today) {
      failures.push(`${name}: ${id} acceptance expired on ${rule.expires}; review it`);
      continue;
    }
    if (!NO_PATCH.has(advisory.patched_versions)) {
      failures.push(`${name}: ${id} now has a patched version (${advisory.patched_versions}); take it instead of the acceptance`);
      continue;
    }
    const chains = (advisory.findings || []).flatMap((finding) => finding.paths || []).map((path) => chainOf(path, name));
    const outside = chains.filter((chain) => !rule.via.every((step, index) => chain[index] === step));
    if (chains.length === 0 || outside.length > 0) {
      failures.push(`${name}: ${id} is reached outside its accepted path (${(outside[0] || ['unknown']).join(' > ')})`);
      continue;
    }
    accepted.push(`${name}: ${id} accepted until ${rule.expires} - ${rule.reason}`);
  }
  return { failures, accepted };
}

function readAudit() {
  let output;
  try {
    output = execFileSync('pnpm', ['audit', '--prod', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // pnpm audit exits non-zero when it finds something; its JSON is still on stdout.
    output = error && typeof error.stdout === 'string' ? error.stdout : '';
  }
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

module.exports = { evaluateAudit, chainOf, ACCEPTED };

if (require.main === module) {
  const { failures, accepted } = evaluateAudit(readAudit());
  for (const line of accepted) console.log(`accepted  ${line}`);
  if (failures.length > 0) {
    for (const line of failures) console.error(`FAIL      ${line}`);
    console.error(`Production audit: ${failures.length} high or critical advisory finding(s).`);
    process.exit(1);
  }
  console.log('Production audit: no high or critical advisory outside a recorded acceptance.');
}
