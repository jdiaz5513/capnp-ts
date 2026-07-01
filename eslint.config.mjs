// Flat config. ESLint 9+ / 10.
//
// Keep it lean: TypeScript-aware recommended rules + prettier to defang the
// style nags. The old `.eslintrc.js` had a pile of plugin noise (jsdoc,
// prefer-arrow, no-null, import) that mostly served to slow the linter down
// and fight the codebase. Gone.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.capnp.ts",
      "**/*.capnp.js",
      "**/*.d.ts",
      "packages/*/bin/**/*.js",
      "packages/*/bin/**/*.ts",
      "packages/*/src/**/*.js",
      "packages/*/test/**/*.js",
      "packages/capnp-ts/src/std/**",
      "packages/js-examples/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Type-aware rules require a project; pull in tsconfig.json.
  {
    files: ["packages/**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The codebase uses console for the codegen CLI; that's fine.
      "no-console": "off",
      // These rules are real footguns on legacy code. Keep them as warnings so
      // we surface them without blocking the build.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      // Noisy on existing patterns; not worth the rewrite yet.
      "no-useless-assignment": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-unassigned-vars": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
    },
  },

  {
    files: ["packages/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },

  prettier,
);
