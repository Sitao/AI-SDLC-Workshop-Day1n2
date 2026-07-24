import { expect, Page } from '@playwright/test';

export async function fillUsername(page: Page, username: string): Promise<void> {
  await page.getByLabel('Username').fill(username);
}

export async function clickRegister(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Register' }).click();
}

export async function clickLogin(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function expectAuthFormVisible(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
}

export function getAuthErrorAlert(page: Page) {
  return page.locator('p[role="alert"]');
}
