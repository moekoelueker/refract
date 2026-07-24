import { defineConfig, devices } from '@playwright/test';

/**
 * Chunk 1 gate config. Three real engines, no substitutions.
 *
 * Note deliberately: it is tempting to run the "mobile" project as Chromium on
 * an iPhone descriptor to avoid a second browser download. Refract must never
 * do that, because engine parity IS the product claim.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: '../../.local/test-results',
  fullyParallel: true,
  reporter: [['list'], ['json', { outputFile: '../../.local/gate.json' }]],
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:4599',
    // 1:1 CSS px to screenshot px, so measurements need no rescaling
    deviceScaleFactor: 1,
    // deterministic captures
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
  },

  projects: [
    // deviceScaleFactor MUST come after the devices spread: `Desktop Safari`
    // carries dSF 2, which silently doubles every screenshot and makes any
    // pixel measurement wrong by exactly 2x. Measured the hard way.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], deviceScaleFactor: 1 } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 } },
  ],

  webServer: {
    command: 'python3 -m http.server 4599 --directory ../..',
    port: 4599,
    reuseExistingServer: true,
    stdout: 'ignore',
  },
});
