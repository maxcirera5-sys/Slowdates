import { expect, test } from '@playwright/test';

/**
 * Core end-to-end flow (demo mode): landing → enter demo → view a proposal →
 * show interest → land on the date/scheduling screen.
 */
test('landing to proposal interest', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /AI finds the connection/i })).toBeVisible();

  await page.getByRole('link', { name: /Create my profile/i }).first().click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole('button', { name: /Enter demo/i }).click();
  await expect(page).toHaveURL(/\/app\/proposals/);
  await expect(page.getByRole('heading', { name: /Your proposals/i })).toBeVisible();

  await page.getByRole('link', { name: /View profile/i }).first().click();
  await expect(page).toHaveURL(/\/app\/proposals\/.+/);

  await page.getByRole('button', { name: /^Interested$/ }).click();
  await expect(page).toHaveURL(/\/app\/dates\/.+/);
  await expect(page.getByText(/Activity/i)).toBeVisible();
});
