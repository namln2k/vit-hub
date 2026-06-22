import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.join(process.cwd(), 'src');

const browserSupabaseImportAllowlist = new Set([
  'contexts/AuthContext.tsx',
  'screens/OneTapComponent.tsx',
  'services/clubs.ts',
  'services/divisions.ts',
  'services/groups.ts',
  'services/organizationAdmin/http.ts',
  'services/sports.ts',
]);

const browserDataApiAllowlist = new Set(['services/divisions.ts', 'services/groups.ts']);

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listSourceFiles(entryPath);
      }

      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : [];
    }),
  );

  return files.flat();
}

function relativeSourcePath(filePath: string) {
  return path.relative(sourceRoot, filePath).replaceAll(path.sep, '/');
}

describe('browser data boundaries', () => {
  it('keeps direct browser Supabase imports inside the shrinking migration allowlist', async () => {
    const violations: string[] = [];

    for (const filePath of await listSourceFiles(sourceRoot)) {
      const source = await readFile(filePath, 'utf8');
      const importsBrowserSupabase = /(?:from\s*|import\s*\()\s*['"]@\/lib\/supabase\/client['"]/.test(
        source,
      );

      if (importsBrowserSupabase) {
        const relativePath = relativeSourcePath(filePath);

        if (!browserSupabaseImportAllowlist.has(relativePath)) {
          violations.push(relativePath);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps direct browser table and RPC calls inside the shrinking migration allowlist', async () => {
    const violations: string[] = [];

    for (const filePath of await listSourceFiles(sourceRoot)) {
      const source = await readFile(filePath, 'utf8');
      const callsDataApi = /\bsupabase\s*\.\s*(?:from|rpc)\s*\(/.test(source);

      if (callsDataApi) {
        const relativePath = relativeSourcePath(filePath);

        if (!browserDataApiAllowlist.has(relativePath)) {
          violations.push(relativePath);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
