const mockInit = jest.fn();
const mockReplayIntegration = jest.fn((options?: unknown) => ({ name: 'Replay', options }));

jest.mock('@sentry/nextjs', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  replayIntegration: (options?: unknown) => mockReplayIntegration(options),
  captureRouterTransitionStart: jest.fn(),
}));

describe('monitoring wiring stays silent outside a production deploy', () => {
  const saved = {
    context: process.env.SENTRY_DEPLOY_CONTEXT,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };

  afterEach(() => {
    mockInit.mockClear();
    jest.resetModules();
    for (const [key, value] of [['SENTRY_DEPLOY_CONTEXT', saved.context], ['NEXT_PUBLIC_SENTRY_DSN', saved.dsn]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each(['@/instrumentation-client', '@/sentry.server.config', '@/sentry.edge.config'])(
    '%s is disabled even with a DSN and a production context when the build is not a production build',
    async (modulePath) => {
      process.env.SENTRY_DEPLOY_CONTEXT = 'production';
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
      await import(modulePath);

      expect(mockInit).toHaveBeenCalledTimes(1);
      // NODE_ENV is "test" in this run.
      expect(mockInit.mock.calls[0][0].enabled).toBe(false);
    },
  );

  it('keeps cross-origin frames out of session recordings so Safari does not throw', async () => {
    await import('@/instrumentation-client');
    expect(mockReplayIntegration).toHaveBeenCalledWith({ block: ['iframe'] });
  });

  it.each(['@/sentry.server.config', '@/sentry.edge.config'])(
    '%s ignores the unparseable router state header sent by outdated automated clients',
    async (modulePath) => {
      await import(modulePath);
      const { ignoreErrors } = mockInit.mock.calls[0][0];
      expect(ignoreErrors.some((pattern: RegExp) =>
        pattern.test('The router state header was sent but could not be parsed.'))).toBe(true);
    },
  );
});
