const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable problematic rules for now
      "import/order": "off",
      "react/jsx-sort-props": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      "react/self-closing-comp": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "no-console": "warn", // Warn about console statements
      "react-hooks/exhaustive-deps": "warn",
      
      // Keep important rules
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "prefer-const": "error",
      "no-var": "error",
      "no-debugger": "error",
      
      // Production best practices
      "no-alert": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
];

module.exports = eslintConfig;
