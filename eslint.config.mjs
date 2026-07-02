// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import rnA11y from 'eslint-plugin-react-native-a11y';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      'pb_data/',
      '*.js',
      'scripts/',
    ],
  },

  // 1. Base: @eslint/js recommended — all files
  js.configs.recommended,

  // 2. TypeScript strict-type-checked — .ts/.tsx only
  ...tseslint.configs.strictTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // 3. Override for tsconfig project path
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { project: ['./tsconfig.json'] },
    },
  },

  // 4. React Native A11y — .tsx only
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-native-a11y': rnA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // accessibilityHint will be added in PR 2 alongside other a11y props
      'react-native-a11y/has-accessibility-hint': 'off',
      'react-native-a11y/has-accessibility-props': 'error',
      'react-native-a11y/has-valid-accessibility-actions': 'error',
      'react-native-a11y/has-valid-accessibility-component-type': 'error',
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-states': 'error',
      'react-native-a11y/has-valid-accessibility-traits': 'error',
      'react-native-a11y/has-valid-accessibility-value': 'error',
      // RestTimer nested touchable will be restructured in PR 2
      'react-native-a11y/no-nested-touchables': 'off',
    },
  },

  // 5. Custom rules
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/features/*/*'],
              message:
                'Features must not import from sibling features. Import from shared/, lib/, stores/, or types/ instead.',
            },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Global relaxations for patterns unavoidable across the codebase
  // ─────────────────────────────────────────────────────────────
  {
    rules: {
      // Zustand stores use void-returning set() in arrow shorthands — standard pattern
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // PocketBase models are typed as `any` (RecordModel) — defensive ?? guards are valid
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Stub async methods in mock clients and auth store don't need await
      '@typescript-eslint/require-await': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Overrides: Test files — relax rules for mock-heavy patterns
  // ─────────────────────────────────────────────────────────────
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Overrides: PocketBase client + services (RecordModel is `any`)
  // ─────────────────────────────────────────────────────────────
  {
    files: ['src/lib/pocketbase/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Overrides: DB modules (sqlite, sync-engine, change-queue
  //    — deal with low-level any-typed data)
  // ─────────────────────────────────────────────────────────────
  {
    files: ['src/lib/db/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 10. Overrides: Zustand stores — void expression returns
  // ─────────────────────────────────────────────────────────────
  {
    files: ['src/stores/**'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 11. Overrides: Feature hooks + screens that deal with PocketBase data
  //     (RecordModel cascades `any` through service calls)
  // ─────────────────────────────────────────────────────────────
  {
    files: ['src/features/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Async handlers in RN TouchableOpacity onPress are standard pattern
      '@typescript-eslint/no-misused-promises': 'off',
      // Template expressions with numbers are harmless in UI contexts
      '@typescript-eslint/restrict-template-expressions': 'off',
      // Floating promises for fire-and-forget operations are intentional
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 12. Overrides: app/ directory (router screens)
  // ─────────────────────────────────────────────────────────────
  {
    files: ['app/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 13. Overrides: pb_migrations (JS files, PocketBase-specific globals)
  // ─────────────────────────────────────────────────────────────
  {
    files: ['pb_migrations/**'],
    rules: {
      'no-undef': 'off',
    },
  }
);
