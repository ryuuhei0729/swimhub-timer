import eslintConfigExpo from "eslint-config-expo/flat.js";

export default [
  ...eslintConfigExpo,
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-named-as-default-member": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
