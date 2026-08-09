const { defineConfig, devices } = require('@playwright/test');

const PORT = 8080;
const baseURL = `http://localhost:${PORT}`;

module.exports = defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    timeout: 30000,
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        // devServer.open is true in webpack.config.js, so use --no-open to
        // prevent webpack-dev-server from launching a browser during tests.
        command: 'npx webpack serve --mode development --no-open',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
});
