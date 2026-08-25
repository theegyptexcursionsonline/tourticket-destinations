import fs from 'node:fs';
import path from 'node:path';

describe('Content Engine delivery source contracts', () => {
  it('runs CI only for main and verifies the exact event commit in every job', () => {
    const source = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    expect(source).toContain('branches: [main]');
    expect(source).not.toContain('develop');
    expect(source).not.toContain('feature/**');
    expect(source.match(/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6/g)).toHaveLength(3);
    expect(source.match(/pnpm\/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6/g)).toHaveLength(3);
    expect(source.match(/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6/g)).toHaveLength(3);
    expect(source).toContain('actions/upload-artifact@330a01c490aca151604b8cf639adc76d48f6c5d4 # v5');
    expect(source.match(/ref: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/g)).toHaveLength(3);
    expect(source.match(/run: test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/g)).toHaveLength(3);
  });

  it('keeps the index migration preflight dry-run and read-only by construction', () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), 'scripts/inspect-content-engine-indexes.ts'),
      'utf8',
    );
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['content-engine:indexes:inspect']).toContain('--dry-run');
    expect(script).toContain("process.argv.includes('--dry-run')");
    expect(script).toContain("mode: 'dry-run-read-only'");
    expect(script).not.toMatch(/\.(?:createIndex|dropIndex|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|bulkWrite)\s*\(/);
  });

  it('declares scoped unique receipts and a TTL expiry index', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/models/ContentPublishReceipt.ts'),
      'utf8',
    );
    expect(source).toContain('{ idempotencyKey: 1, tenantId: 1, contentType: 1 }');
    expect(source).toContain('{ unique: true }');
    expect(source).toContain("ContentPublishReceiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })");
  });
});
