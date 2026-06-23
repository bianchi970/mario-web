import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function isBrowserSource(filePath: string): boolean {
  if (!/\.(ts|tsx)$/.test(filePath)) return false;
  if (/\.test\.(ts|tsx)$/.test(filePath)) return false;
  if (filePath.includes(`${path.sep}app${path.sep}api${path.sep}`)) return false;
  return (
    filePath.includes(`${path.sep}components${path.sep}`) ||
    filePath.includes(`${path.sep}app${path.sep}`) ||
    filePath.includes(`${path.sep}lib${path.sep}`)
  );
}

describe('browser-side hub execution boundary', () => {
  test('no browser source still sends domotic execution mutations to /api/hub', () => {
    const bannedPatterns = [
      /\/api\/hub\/devices\/[^'"`\s]+\/command/,
      /\/api\/hub\/api\/hub\/[^'"`\s]+\/dispatch/,
      /\/api\/hub\/automations\/[^'"`\s]+\/[^'"`\s]+\/run/,
    ];

    const offendingFiles = walk(sourceRoot)
      .filter(isBrowserSource)
      .filter((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        return bannedPatterns.some((pattern) => pattern.test(content));
      })
      .map((filePath) => path.relative(repoRoot, filePath));

    expect(offendingFiles).toEqual([]);
  });
});
