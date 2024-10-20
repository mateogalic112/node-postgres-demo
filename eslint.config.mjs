import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { files: ["**/*.ts"] },
  { languageOptions: { globals: globals.node } },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_", // Ignore unused arguments starting with an underscore
          varsIgnorePattern: "^_" // Ignore unused variables starting with an underscore
        }
      ]
    }
  },
  {
    ignores: [
      "node_modules/", // Ignore dependencies
      "dist/", // Ignore build directory
      "*.js", // Ignore compiled JavaScript files
      "*.d.ts", // Ignore TypeScript declaration files
      "logs/", // Ignore log files
      "*.log", // Ignore any log files
      "coverage/", // Ignore coverage reports
      ".env", // Ignore environment variables
      "public/" // Ignore public static assets
    ]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended
];
