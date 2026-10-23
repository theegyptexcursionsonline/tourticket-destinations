import { execFileSync } from 'node:child_process';

function runKeepWarm(rejectOne: boolean) {
  const source = `
    const requests = [];
    const events = [];
    console.log = (line) => events.push(String(line));
    globalThis.fetch = async (url, init) => {
      events.push('fetch');
      requests.push({ url, userAgent: init.headers['user-agent'] });
      if (${JSON.stringify(rejectOne)} && requests.length === 1) throw new Error('test failure');
      return new Response('', { status: 200 });
    };
    const mod = await import('./netlify/functions/keep-warm.mjs');
    const response = await mod.default();
    process.stdout.write(JSON.stringify({ status: response.status, body: await response.text(), requests, events, schedule: mod.config.schedule }));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }));
}

it.each([false, true])('logs the runtime before the original pings and preserves failure tolerance (%s)', (rejectOne) => {
  const result = runKeepWarm(rejectOne);
  expect(result.events[0]).toBe('[node-runtime] ' + JSON.stringify({ function: 'keep-warm', node: process.version }));
  expect(result).toMatchObject({ status: 200, body: 'ok', schedule: '*/5 * * * *' });
  expect(result.requests).toEqual([
    { url: 'https://dashboard.egypt-excursionsonline.com/admin', userAgent: 'eeo-keep-warm/1.0' },
    { url: 'https://dashboard.egypt-excursionsonline.com/api/hero-settings', userAgent: 'eeo-keep-warm/1.0' },
  ]);
  expect(result.events.some((event: string) => event.startsWith('ping failed:'))).toBe(rejectOne);
});
