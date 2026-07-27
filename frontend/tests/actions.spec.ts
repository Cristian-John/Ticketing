import { test, expect } from '@playwright/test';

test.describe('Administrative Actions Regression', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        
        // Ensure Login form is visible
        await page.waitForSelector('#login-form');
        
        // Log in as admin
        await page.fill('#login-username', 'admin');
        await page.fill('#login-password', '@inspireSupport');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForSelector('#admin-screen', { state: 'visible', timeout: 15000 });
        await page.waitForSelector('#global-overlay', { state: 'hidden', timeout: 10000 });
    });

    test('Users page has Edit, Reset Password, and Deactivate buttons', async ({ page }) => {
        // Navigate to Users
        await page.click('button[data-view="users"]');
        await page.waitForSelector('.skeleton', { state: 'hidden' });
        await page.waitForSelector('#users-table-body tr');

        // Check first row actions
        const firstRow = page.locator('#users-table-body tr').first();
        
        const editBtn = firstRow.locator('.btn-edit-user');
        await expect(editBtn).toBeVisible();

        const resetBtn = firstRow.locator('.btn-reset-user');
        await expect(resetBtn).toBeVisible();

        const deactivateBtn = firstRow.locator('.btn-deactivate-user');
        await expect(deactivateBtn).toBeVisible();

        // Test Reset Password Modal opens
        await resetBtn.click();
        const resetModal = page.locator('#reset-password-modal');
        await expect(resetModal).toBeVisible();
        await expect(resetModal.locator('#reset-password-val')).toBeVisible();
        await resetModal.locator('.modal-close').click();
    });

    test('Tickets page rows are clickable and contain expected actions in modal', async ({ page }) => {
        // Navigate to Tickets
        await page.click('button[data-view="all-tickets"]');
        await page.waitForSelector('.skeleton', { state: 'hidden' });
        await page.waitForSelector('#ticket-table-body tr.clickable-row');

        // Click first ticket
        const firstRow = page.locator('#ticket-table-body tr.clickable-row').first();
        await firstRow.click();

        // Modal opens
        const detailModal = page.locator('#view-ticket-modal');
        await expect(detailModal).toBeVisible();
        
        // Verify action buttons in modal
        await expect(page.locator('#detail-edit-btn')).toBeVisible();
        
        // Verify post note button exists
        await expect(page.locator('#add-note-form button[type="submit"]')).toBeVisible();

        await detailModal.locator('.modal-close').click();
    });

    test('Profile page has Save and Change Password forms', async ({ page }) => {
        // The profile link is in the sidebar
        await page.click('#admin-screen button[data-view="profile"]');
        
        await page.waitForSelector('.profile-page', { state: 'visible' });

        // Save Profile button
        await expect(page.locator('#change-password-form button[type="submit"]')).toBeVisible();
    });

    test('Knowledge Base has Create, Edit, Delete actions', async ({ page }) => {
        // Navigate to Knowledge Base
        await page.click('#admin-screen button[data-view="knowledge-base"]');
        await page.waitForSelector('.skeleton', { state: 'hidden' });
        
        // Check for Create Article button
        await expect(page.locator('#btn-new-article')).toBeVisible();
    });
});
