const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'src/components/**', 'src/constants/**', 'src/hooks/**'],
  },
]);
