/** @jest-environment node */
import { dynamic, GET } from '@/app/api/version/route';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_VERSION = Object.getOwnPropertyDescriptor(process, 'version')!;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  Object.defineProperty(process, 'version', ORIGINAL_VERSION);
});

describe('/api/version', () => {
  it('reports build identity and the actual serving runtime without caching', async () => {
    process.env.COMMIT_REF = 'f0932e43f847b9983084893f43dc7342d9616aca';
    process.env.BRANCH = 'main';
    process.env.NODE_VERSION = 'build-only-version';
    process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs99.x';
    Object.defineProperty(process, 'version', { ...ORIGINAL_VERSION, value: 'v22.23.4' });

    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      commit: 'f0932e43f847b9983084893f43dc7342d9616aca',
      branch: 'main',
      node: 'v22.23.4',
    });
    expect(dynamic).toBe('force-dynamic');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });

  it('reads the runtime on every request rather than at module load', async () => {
    Object.defineProperty(process, 'version', { ...ORIGINAL_VERSION, value: 'v22.23.4' });
    await expect(GET().json()).resolves.toHaveProperty('node', 'v22.23.4');
    Object.defineProperty(process, 'version', { ...ORIGINAL_VERSION, value: 'v24.22.1' });
    await expect(GET().json()).resolves.toHaveProperty('node', 'v24.22.1');
  });

  it('keeps missing build identity explicit and never exposes environment values', async () => {
    delete process.env.COMMIT_REF;
    delete process.env.BRANCH;
    process.env.RUNTIME_TEST_PRIVATE_VALUE = 'private-value-must-not-leak';

    await expect(GET().json()).resolves.toEqual({
      commit: null,
      branch: null,
      node: process.version,
    });
  });
});
