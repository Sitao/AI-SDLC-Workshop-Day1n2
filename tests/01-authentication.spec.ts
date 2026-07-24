import { test, expect } from '@playwright/test';
import {
  clickLogin,
  clickRegister,
  expectAuthFormVisible,
  fillUsername,
  getAuthErrorAlert,
} from './helpers';

test.describe('authentication ui', () => {
  test('renders login form controls', async ({ page }) => {
    await page.goto('/login');

    await expectAuthFormVisible(page);
  });

  test('shows validation when username is blank on register', async ({ page }) => {
    await page.goto('/login');

    await clickRegister(page);

    await expect(getAuthErrorAlert(page)).toContainText('Username is required');
  });

  test('shows validation when username is blank on login', async ({ page }) => {
    await page.goto('/login');

    await clickLogin(page);

    await expect(getAuthErrorAlert(page)).toContainText('Username is required');
  });

  test('submits registration request and surfaces api error', async ({ page }) => {
    await page.route('**/api/auth/register-options', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Username already taken' }),
      });
    });

    await page.goto('/login');
    await fillUsername(page, 'alice');
    await clickRegister(page);

    await expect(getAuthErrorAlert(page)).toContainText('Username already taken');
  });

  test('submits login request and surfaces api error', async ({ page }) => {
    await page.route('**/api/auth/login-options', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'User not found' }),
      });
    });

    await page.goto('/login');
    await fillUsername(page, 'alice');
    await clickLogin(page);

    await expect(getAuthErrorAlert(page)).toContainText('User not found');
  });
});
