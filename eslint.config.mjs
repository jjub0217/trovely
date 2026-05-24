import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Next.js Core Web Vitals (React/Hooks/a11y/import 포함) + TypeScript 규칙
  ...nextVitals,
  ...nextTs,

  // 빌드 산출물·설정 파일 등 검사 제외
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "*.config.js",
    "*.config.ts",
    "*.config.mjs",
    "public/**",
  ]),

  // 프로젝트 공통 규칙
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-unused-vars": "off", // TS가 처리
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
