import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.{ts}"] },
  { languageOptions: { globals: globals.browser } },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_", // Ignore unused arguments starting with an underscore
          varsIgnorePattern: "^_" // Ignore unused variables starting with an underscore
        }
      ],
      "@typescript-eslint/explicit-function-return-type": "off" // Disable explicit return type enforcement
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended
];
