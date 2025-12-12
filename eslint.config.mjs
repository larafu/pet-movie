import nextConfig from 'eslint-config-next';

const ignores = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.source/**',
  '**/dist/**',
  '**/coverage/**',
];

const relaxedRules = {
  '@next/next/no-img-element': 'off',
  '@next/next/no-assign-module-variable': 'off',
  '@next/next/no-html-link-for-pages': 'off',
  'jsx-a11y/alt-text': 'off',
  'import/no-anonymous-default-export': 'off',
  'react/no-unescaped-entities': 'off',
  'react/display-name': 'off',
  'react-hooks/exhaustive-deps': 'warn',
  'react-hooks/set-state-in-effect': 'off',
  'react-hooks/preserve-manual-memoization': 'off',
  'react-hooks/rules-of-hooks': 'off',
  'react-hooks/error-boundaries': 'off',
  'react-hooks/static-components': 'off',
  'react-hooks/purity': 'off',
  'react-hooks/immutability': 'off',
};

const config = [
  {
    ignores,
  },
  ...nextConfig,
  {
    rules: relaxedRules,
  },
];

export default config;
