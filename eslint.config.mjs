import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "drizzle/**",
      "node_modules/**",
      "pnpm-lock.yaml"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
