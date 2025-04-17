import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
  {
    ignores: ["**/*.ts", "**/*test.js"]
  },
  {
    files: ["**/*.{mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "off"
    }
  },
  {
    files: ["**/*.{mjs,cjs}"],
    languageOptions: { globals: globals.browser }
  },
]);
