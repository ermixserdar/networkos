// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["app/backup.tsx"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  {
    files: ["app/companies/[id].tsx"],
    rules: { "import/no-duplicates": "off" },
  },
  {
    files: ["app/profile.tsx"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  }
]);
