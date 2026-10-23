import { execFileSync } from 'node:child_process';

it('logs only the fixed function identity and request-time Node version', () => {
  const source = `
    const { logNodeRuntime } = await import('./netlify/lib/node-runtime.mjs');
    process.env.RUNTIME_TEST_PRIVATE_VALUE = 'private-value-must-not-leak';
    process.env.NODE_VERSION = 'build-only-version';
    Object.defineProperty(process, 'version', { value: 'v22.23.4' });
    logNodeRuntime('keep-warm');
    Object.defineProperty(process, 'version', { value: 'v24.22.1' });
    logNodeRuntime('revenue-maintenance');
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const lines = output.trim().split(/\r?\n/);
  expect(lines).toEqual([
    '[node-runtime] {"function":"keep-warm","node":"v22.23.4"}',
    '[node-runtime] {"function":"revenue-maintenance","node":"v24.22.1"}',
  ]);
});
