import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['test/**/*.e2e-spec.ts', 'node_modules', 'dist'],
    pool: 'forks',
    // Several specs hit the shared Postgres dev DB (registry,
    // approvals). Run spec files sequentially so they can't race on
    // the same Permission / Approval / User rows.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{spec,test,module}.ts', 'src/main.ts'],
    },
  },
});
