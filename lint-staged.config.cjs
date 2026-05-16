/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,md,yaml,yml,css}': ['prettier --write'],
  '*.prisma': ['prettier --write --plugin=prisma'],
};
