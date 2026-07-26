import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

/** Shared mock setup for authenticated sessions */
async function setupMocks(page: import('@playwright/test').Page, role: 'admin' | 'client') {
    // Fallback for all APIs
    await page.route('**/api/v1/**', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        } else {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        }
    });

    const user = role === 'admin'
        ? { id: 'mock-1', username: 'admin', fullName: 'Admin User', role: 'admin', token: 'mock-token' }
        : { id: 'mock-2', username: 'client', fullName: 'Client User', role: 'client', token: 'mock-token' };

    await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user }),
        });
    });
    await page.route('**/api/v1/auth/validate', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user }),
        });
    });
    await page.route('**/api/v1/stats', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                total: 42, open: 12, inProgress: 8, resolved: 18, closed: 4,
                byDepartment: { IT: 15, HR: 10, Finance: 8, Operations: 9 },
                bySeverity: { Critical: 3, High: 7, Medium: 15, Low: 17 },
            }),
        });
    });
    await page.route('**/api/v1/users**', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { id: 'USR-1', username: 'admin', fullName: 'Admin User', email: 'admin@support.com', role: 'admin', active: 1 },
                { id: 'USR-2', username: 'john', fullName: 'John Smith', email: 'john@support.com', role: 'it-support', active: 1 },
            ]),
        });
    });
}

test.describe('Issue 1 – Theme Toggle Layout Verification', () => {
    test.setTimeout(30000);

    test('Login page: fixed theme toggle visible at all viewports', async ({ page }) => {
        await page.goto(BASE);
        await page.waitForSelector('#login-screen.active', { timeout: 5000 });

        // Theme toggle should be visible within the login screen
        const loginToggle = page.locator('#login-screen .theme-toggle.global-theme-toggle');
        await expect(loginToggle).toBeVisible();

        // Verify it's positioned in top area
        const box = await loginToggle.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.y).toBeLessThan(60);

        // Screenshot desktop
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-login-desktop.png', fullPage: false });

        // Tablet (768px)
        await page.setViewportSize({ width: 768, height: 900 });
        await expect(loginToggle).toBeVisible();
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-login-tablet.png', fullPage: false });

        // Mobile (480px)
        await page.setViewportSize({ width: 480, height: 800 });
        await expect(loginToggle).toBeVisible();
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-login-mobile.png', fullPage: false });
    });

    test('Admin portal: theme toggle in topbar, no collision with Create User', async ({ page }) => {
        await setupMocks(page, 'admin');
        await page.goto(BASE);
        await page.waitForSelector('#login-screen.active', { timeout: 5000 });

        // Login as admin
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('#login-form button[type="submit"]');
        await page.waitForSelector('#admin-screen.active', { timeout: 10000 });

        // Theme toggle should be inside the topbar-actions container
        const topbarToggle = page.locator('#admin-screen .topbar-actions .theme-toggle');
        await expect(topbarToggle).toBeVisible();

        // Screenshot admin dashboard
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-admin-dashboard.png', fullPage: false });

        // Navigate to Users page
        await page.click('[data-view="users"]');
        await page.waitForTimeout(1000);

        // Both the create user button and theme toggle should be visible and NOT overlapping
        const createBtn = page.locator('#create-user-btn');
        const themeBtn = page.locator('#admin-screen .topbar-actions .theme-toggle');
        await expect(createBtn).toBeVisible();
        await expect(themeBtn).toBeVisible();

        const createBox = await createBtn.boundingBox();
        const themeBox = await themeBtn.boundingBox();
        expect(createBox).toBeTruthy();
        expect(themeBox).toBeTruthy();

        // Verify no horizontal overlap
        const createRight = createBox!.x + createBox!.width;
        const themeLeft = themeBox!.x;
        expect(themeLeft).toBeGreaterThanOrEqual(createRight - 2);

        // Screenshot admin Users page (the key regression test)
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-admin-users-desktop.png', fullPage: false });

        // Tablet (768px)
        await page.setViewportSize({ width: 768, height: 900 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-admin-users-tablet.png', fullPage: false });

        // Mobile (480px)
        await page.setViewportSize({ width: 480, height: 800 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-admin-users-mobile.png', fullPage: false });
    });

    test('Client portal: theme toggle in topbar', async ({ page }) => {
        await setupMocks(page, 'client');
        await page.goto(BASE);
        await page.waitForSelector('#login-screen.active', { timeout: 5000 });

        // Login as client
        await page.fill('#login-username', 'client');
        await page.fill('#login-password', 'client123');
        await page.click('#login-form button[type="submit"]');
        await page.waitForSelector('#client-screen.active', { timeout: 10000 });

        // Theme toggle should be inside the client topbar-actions container
        const topbarToggle = page.locator('#client-screen .topbar-actions .theme-toggle');
        await expect(topbarToggle).toBeVisible();

        // Screenshot client portal
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-client-desktop.png', fullPage: false });

        // Tablet
        await page.setViewportSize({ width: 768, height: 900 });
        await expect(topbarToggle).toBeVisible();
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-client-tablet.png', fullPage: false });

        // Mobile
        await page.setViewportSize({ width: 480, height: 800 });
        await expect(topbarToggle).toBeVisible();
        await page.screenshot({ path: 'docs/architecture/v1.1-refactor/screenshots/qa-client-mobile.png', fullPage: false });
    });

    test('Theme toggle functionality: all instances toggle theme in sync', async ({ page }) => {
        await setupMocks(page, 'admin');
        await page.goto(BASE);
        await page.waitForSelector('#login-screen.active', { timeout: 5000 });

        // Login as admin
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('#login-form button[type="submit"]');
        await page.waitForSelector('#admin-screen.active', { timeout: 10000 });

        // Initial state should be dark
        const theme = await page.getAttribute('html', 'data-theme');
        expect(theme).toBe('dark');

        // Click the topbar theme toggle
        await page.click('#admin-screen .topbar-actions .theme-toggle');
        const lightTheme = await page.getAttribute('html', 'data-theme');
        expect(lightTheme).toBe('light');

        // Toggle text should update to "Light Mode" on all visible toggles
        const toggleTexts = await page.locator('.theme-toggle span:last-child').allTextContents();
        for (const text of toggleTexts) {
            if (text) expect(text).toBe('Light Mode');
        }

        // Switch back to dark
        await page.click('#admin-screen .topbar-actions .theme-toggle');
        const darkTheme = await page.getAttribute('html', 'data-theme');
        expect(darkTheme).toBe('dark');
    });
});
