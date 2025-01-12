import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  {
    languageOptions: {
      globals: {
        ...globals.node, // Enable Node.js globals like `process`
      },
    },
  },
  {
    files: ["test/**/*.js"], // Match test files in the "test" directory
    languageOptions: {
      globals: {
        ...globals.node, // Include Node.js globals
        ...globals.jest, // Include Jest globals (if using Jest)
      },
    },
  },
  {
    languageOptions: {
      globals: globals.browser, // Enable browser globals for browser-related files, if any
    },
  },
  pluginJs.configs.recommended,
];
