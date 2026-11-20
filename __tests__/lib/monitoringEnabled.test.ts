import {
  IGNORED_SERVER_ERRORS,
  isLocalHostname,
  shouldEnableMonitoring,
} from '@/lib/monitoring/monitoringEnabled';

describe('error monitoring only reports from a real production deploy', () => {
  it('reports from a Netlify production build on a public domain', () => {
    expect(shouldEnableMonitoring({
      nodeEnv: 'production',
      deployContext: 'production',
      hostname: 'hurghadaexcursionsonline.com',
    })).toBe(true);
  });

  it('reports from the production server, where no hostname is known', () => {
    expect(shouldEnableMonitoring({ nodeEnv: 'production', deployContext: 'production' })).toBe(true);
  });

  it('stays silent on a local development server', () => {
    expect(shouldEnableMonitoring({
      nodeEnv: 'development',
      deployContext: undefined,
      hostname: 'localhost',
    })).toBe(false);
  });

  it('stays silent in development even if a production context leaked into the environment', () => {
    expect(shouldEnableMonitoring({ nodeEnv: 'development', deployContext: 'production' })).toBe(false);
    expect(shouldEnableMonitoring({ nodeEnv: 'test', deployContext: 'production' })).toBe(false);
  });

  it('stays silent for a local production build, which has no deploy context', () => {
    expect(shouldEnableMonitoring({ nodeEnv: 'production', deployContext: undefined })).toBe(false);
    expect(shouldEnableMonitoring({ nodeEnv: 'production', deployContext: '' })).toBe(false);
  });

  it.each(['deploy-preview', 'branch-deploy', 'dev'])('stays silent for the %s context', (deployContext) => {
    expect(shouldEnableMonitoring({ nodeEnv: 'production', deployContext })).toBe(false);
  });

  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '::1', '[::1]', '0.0.0.0', 'shop.localhost', 'mac.local', 'eeo.test'])(
    'stays silent when a production bundle is opened on %s',
    (hostname) => {
      expect(isLocalHostname(hostname)).toBe(true);
      expect(shouldEnableMonitoring({ nodeEnv: 'production', deployContext: 'production', hostname })).toBe(false);
    },
  );

  it.each(['hurghadaexcursionsonline.com', 'localhost-tours.com', '127.example.com', null, undefined, ''])(
    'does not treat %p as a local host',
    (hostname) => {
      expect(isLocalHostname(hostname)).toBe(false);
    },
  );

  it('ignores only the unparseable router state header error on the server', () => {
    const matches = (message: string) => IGNORED_SERVER_ERRORS.some((pattern) => pattern.test(message));
    expect(matches('Error: The router state header was sent but could not be parsed.')).toBe(true);
    expect(matches('MongoServerSelectionError: connection timed out')).toBe(false);
    expect(matches('Pricing option unavailable')).toBe(false);
  });
});
