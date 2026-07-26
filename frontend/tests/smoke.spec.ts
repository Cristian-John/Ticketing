import { test, expect } from '@playwright/test';

test.describe('Ticketing System Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Fallback for all other APIs MUST BE FIRST
        await page.route('**/api/v1/**', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            }
        });

        // Mock Auth
        await page.route('**/api/v1/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: { id: 'mock-1', username: 'admin', fullName: 'Admin User', role: 'admin', token: 'mock-token' },
                }),
            });
        });
        await page.route('**/api/v1/auth/validate', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: { id: 'mock-1', username: 'admin', fullName: 'Admin User', role: 'admin', token: 'mock-token' },
                }),
            });
        });
    });

    test('Critical Workflows: Login, Navigation, Modals, Logout', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
        page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
        
        await page.goto('/');

        // 1. Login
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', 'password');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(1000); // Wait a bit to see if logs appear

        // Verify Admin Screen is visible
        await expect(page.locator('#admin-screen')).toBeVisible();
        await expect(page.locator('#admin-screen .page-title')).toHaveText('Dashboard');

        // 2. Navigation
        // Tickets
        await page.click('#admin-screen button.sb-nav-btn[data-view="all-tickets"]');
        await expect(page.locator('#admin-screen .page-title')).toHaveText('All Tickets');

        // Users
        await page.click('#admin-screen button.sb-nav-btn[data-view="users"]');
        await expect(page.locator('#admin-screen .page-title')).toHaveText('User Management');

        // Knowledge Base
        await page.click('#admin-screen button.sb-nav-btn[data-view="knowledge-base"]');
        await expect(page.locator('#admin-screen .page-title')).toHaveText('Knowledge Base');

        // Profile
        await page.click('#admin-screen button.sb-nav-btn[data-view="profile"]');
        await expect(page.locator('#admin-screen .page-title')).toHaveText('My Profile');

        // 3. Logout
        await page.click('#admin-logout-btn');
        const logoutModal = page.locator('#logout-confirm-modal');
        await expect(logoutModal).toBeVisible();
        await page.click('#confirm-logout-btn');

        // Verify return to login
        await expect(page.locator('#login-screen')).toBeVisible();
    });
});
