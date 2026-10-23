import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Netlify deploys the storefront's functions (checkout and the Stripe webhook
 * among them) on the AWS Lambda runtime of the build's Node.js line, and AWS
 * applies Node.js security releases to a maintained runtime in place. Node 20
 * reached end of life in April 2026, so its runtime missed the 21 Oct 2026
 * security release. The build line stays on a maintained one.
 */
describe('function runtime Node.js line', () => {
  const netlifyToml = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8');

  it('builds on a maintained Node.js line', () => {
    const match = netlifyToml.match(/^\s*NODE_VERSION\s*=\s*"(\d+)(?:\.\d+){0,2}"/m);
    expect(match).not.toBeNull();
    expect([22, 24]).toContain(Number(match![1]));
  });
});
