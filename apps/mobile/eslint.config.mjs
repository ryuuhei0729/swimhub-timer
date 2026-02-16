import eslintConfigExpo from "eslint-config-expo/flat.js";

export default [
  ...eslintConfigExpo,
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
