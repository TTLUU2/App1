import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design reference material — Figma exports + iOS UI captures that
    // live in the repo for handoff but aren't part of the app. Not
    // shipped, not typechecked either.
    "design-refs/**",
    "design_handoff_lacquer_refresh/**",
    "ios-test/**",
  ]),
  {
    rules: {
      // React 19's new hooks rules ship as `error` in eslint-config-next
      // but flag many legitimate patterns until the Effect Event API
      // (react.dev/reference/react/experimental_useEffectEvent) is
      // stable. Downgraded to `warn` so they surface in local dev and
      // in PR diffs without failing CI on every one-shot init-from-
      // sessionStorage / init-from-props effect. Revisit and enforce
      // as `error` once the codebase migrates to Effect Events (or
      // we've paid down the existing offenders with targeted disable
      // comments).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
