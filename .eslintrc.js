module.exports = {
  root: true,
  extends: 'eslint-config-expo',
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', '.']
      }
    }
  },
  rules: {
    'import/no-unresolved': 'off'
  }
};
