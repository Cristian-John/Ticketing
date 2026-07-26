import { test } from '@playwright/test';
import path from 'path';

const screenshotDir = path.resolve('docs/architecture/v1.1-refactor/screenshots');

test.describe('Phase 13 - Visual Regression Walkthrough', () => {
    test.setTimeout(60000);

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

        // Mock stats
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

        // Mock tickets
        await page.route('**/api/v1/tickets', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'TKT-001', title: 'VPN Connection Issues', status: 'Open', priority: 'High', severity: 'High', department: 'IT', assignee: 'John Smith', createdAt: '2026-07-25T10:00:00Z', description: 'Cannot connect to VPN from remote office.' },
                    { id: 'TKT-002', title: 'Email Not Syncing', status: 'In Progress', priority: 'Medium', severity: 'Medium', department: 'HR', assignee: 'Jane Doe', createdAt: '2026-07-24T14:00:00Z', description: 'Outlook not syncing new emails.' },
                    { id: 'TKT-003', title: 'Printer Offline', status: 'Resolved', priority: 'Low', severity: 'Low', department: 'Finance', assignee: 'Admin User', createdAt: '2026-07-23T09:00:00Z', description: 'Floor 3 printer shows offline.' },
                ]),
            });
        });

        // Mock users
        await page.route('**/api/v1/users', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'u1', username: 'admin', fullName: 'Admin User', email: 'admin@test.com', role: 'admin', department: 'IT', createdAt: '2026-01-01T00:00:00Z' },
                    { id: 'u2', username: 'jsmith', fullName: 'John Smith', email: 'john@test.com', role: 'it-support', department: 'IT', createdAt: '2026-02-15T00:00:00Z' },
                    { id: 'u3', username: 'jdoe', fullName: 'Jane Doe', email: 'jane@test.com', role: 'client', department: 'HR', createdAt: '2026-03-20T00:00:00Z' },
                ]),
            });
        });

        // Mock articles
        await page.route('**/api/v1/articles', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'a1', title: 'How to Reset Your Password', category: 'Account', content: 'Navigate to Settings > Security > Change Password.', author: 'admin', updatedAt: '2026-07-20T00:00:00Z' },
                    { id: 'a2', title: 'VPN Setup Guide', category: 'Network', content: 'Download the VPN client from the IT portal and follow the setup wizard.', author: 'admin', updatedAt: '2026-07-18T00:00:00Z' },
                ]),
            });
        });
    });

    test('Full Application Walkthrough with Screenshots', async ({ page }) => {
        // Scope all nav clicks to the visible admin sidebar
        const adminSidebar = page.locator('#admin-sidebar');

        // 1. Login Page
        await page.goto('/');
        await page.waitForSelector('#login-form', { timeout: 5000 });
        await page.screenshot({ path: `${screenshotDir}/01-login-page.png`, fullPage: true });

        // 2. Perform Login
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', 'admin123');
        await page.click('#login-btn');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${screenshotDir}/02-dashboard.png`, fullPage: true });

        // 3. Navigate to Tickets
        await adminSidebar.locator('[data-view="all-tickets"]').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/03-tickets-page.png`, fullPage: true });

        // 4. Navigate to Users
        await adminSidebar.locator('[data-view="users"]').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/04-users-page.png`, fullPage: true });

        // 5. Navigate to Knowledge Base
        await adminSidebar.locator('[data-view="knowledge-base"]').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/05-knowledge-base.png`, fullPage: true });

        // 6. Navigate to Profile
        await adminSidebar.locator('[data-view="profile"]').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/06-profile-page.png`, fullPage: true });

        // 7. Return to Dashboard
        await adminSidebar.locator('[data-view="dashboard"]').click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/07-dashboard-return.png`, fullPage: true });

        // 8. Logout
        await page.click('#admin-logout-btn');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${screenshotDir}/08-post-logout.png`, fullPage: true });
    });
});
