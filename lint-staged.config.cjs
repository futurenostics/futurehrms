/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write --ignore-unknown',
  ],
  '*.{json,md,yaml,yml,css}': ['prettier --write --ignore-unknown'],
};
