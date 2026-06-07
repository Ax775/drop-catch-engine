import { test, expect } from '@playwright/test';

/**
 * Full-stack flow against the local Worker: ingest a uniquely-named domain via
 * the UI and confirm it round-trips (toast → worker → D1 → table). Uses a unique
 * name per run so the test is independent of existing data. Async queue scoring
 * is covered by unit tests, so here we only assert the row appears.
 */
test('ingesting a domain shows a toast and the row appears in the table', async ({ page }) => {
  const unique = `e2e-${Date.now()}.com`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Add domains' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add domains' });
  await dialog.getByRole('textbox').fill(`${unique}, 150`);

  const submit = dialog.getByRole('button', { name: /Ingest 1 domain/ });
  await expect(submit).toBeEnabled();
  await submit.click();

  // Success toast (role="status") and the modal closes.
  await expect(page.getByText('1 domain queued for scoring')).toBeVisible();
  await expect(dialog).toBeHidden();

  // Filter the table to the freshly ingested domain and confirm it shows up.
  await page.getByPlaceholder('Search domains…').fill(unique);
  await expect(page.getByText(unique)).toBeVisible({ timeout: 15_000 });
});
