import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import aitDevtools from '@apps-in-toss/devtools/unplugin';

export default defineConfig(({ command }) => ({
  // Relative assets support static hosting under a subdirectory.
  base: './',
  plugins: [
    // Official browser mocks/panel are never included in production builds.
    ...(command === 'serve' ? [aitDevtools.vite()] : []),
    {
      name: 'merry-village-build-info',
      apply: 'build',
      generateBundle() {
        const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
        if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit) {
          throw new Error('Checkout HEAD does not match GITHUB_SHA');
        }
        this.emitFile({
          type: 'asset',
          fileName: 'build-info.json',
          source: JSON.stringify({
            appName: 'merry-village',
            commit,
            runId: process.env.GITHUB_RUN_ID ?? 'local',
            runNumber: process.env.GITHUB_RUN_NUMBER ?? 'local',
            runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? 'local',
          }, null, 2) + '\n',
        });
      },
    },
  ],
}));
