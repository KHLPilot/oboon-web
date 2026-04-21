import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    files: [
      "components/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "features/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "shared/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "app/components/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "**/*.client.{ts,tsx,js,jsx,mjs,cjs}",
    ],
    ignores: [
      "**/*.server.{ts,tsx,js,jsx,mjs,cjs}",
      "**/*.serverActions.{ts,tsx,js,jsx,mjs,cjs}",
      "app/api/**",
      "features/**/services/**",
      "features/**/server/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabaseAdmin",
              message:
                "Import this module only from server-only route handlers or server actions.",
            },
            {
              name: "@/lib/services/supabase-admin",
              message:
                "Import this module only from server-only route handlers or server actions.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
