const nextConfig = require('eslint-config-next');

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**'],
    rules: {
      // These effects synchronize async API state and browser session state.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

module.exports = config;
