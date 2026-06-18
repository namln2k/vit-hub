import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', '.next', 'next-env.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: [
      'src/contexts/**/*.{ts,tsx}',
      'src/screens/**/*.{ts,tsx}',
      'src/shared/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/features/**/components/**/*.{ts,tsx}',
      'src/features/**/hooks/**/*.{ts,tsx}',
      'src/features/**/contexts/**/*.{ts,tsx}',
      'src/features/**/client/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/server/**'],
              message:
                'Browser and client modules must use DTOs, client helpers, or Server Actions instead of importing src/server.',
            },
            {
              group: ['@/services/supabase'],
              message:
                'Direct browser Supabase access is restricted to the temporary migration allowlist.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/contexts/AuthContext.tsx',
      'src/services/clubs.ts',
      'src/services/divisions.ts',
      'src/services/groups.ts',
      'src/services/sports.ts',
      'src/services/organizationAdmin/http.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/server/**'],
              message:
                'Browser and client modules must use DTOs, client helpers, or Server Actions instead of importing src/server.',
            },
          ],
        },
      ],
    },
  },
]);
