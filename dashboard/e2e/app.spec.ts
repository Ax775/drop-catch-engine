import { test, expect } from '@playwright/test';

test.describe('App shell & navigation', () => {
  test('loads the dashboard with the three tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Drop Catch Engine' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Domains' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'ROI Calculator' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'System Logs' })).toBeVisible();
  });

  test('arrow keys move between tabs (WAI-ARIA roving tabindex)', async ({ page }) => {
    await page.goto('/');
    const domains = page.getByRole('tab', { name: 'Domains' });
    await domains.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'ROI Calculator' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

test.describe('ROI Calculator (pure client logic)', () => {
  test('computes value, ROI and break-even from the default inputs', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'ROI Calculator' }).click();

    // Defaults: cost 100, DA 30, backlinks 200, authority 2 → value €750, ROI 650%, 48 mo
    await expect(page.getByText('€750')).toBeVisible();
    await expect(page.getByText('650.0%')).toBeVisible();
    await expect(page.getByText('48.0 mo')).toBeVisible();
    await expect(page.getByText('High Value')).toBeVisible();
  });

  test('recomputes when acquisition cost changes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'ROI Calculator' }).click();

    const cost = page.getByLabel('Acquisition Cost (€)');
    await cost.fill('250');
    // value unchanged (€750), ROI = (750-250)/250*100 = 200%
    await expect(page.getByText('200.0%')).toBeVisible();
  });
});

test.describe('Ingest modal (client-side validation)', () => {
  test('counts valid lines and flags invalid ones; enables submit accordingly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add domains' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add domains' });
    await expect(dialog).toBeVisible();

    const submit = dialog.getByRole('button', { name: /Ingest/ });
    await expect(submit).toBeDisabled(); // nothing entered yet

    await dialog.getByRole('textbox').fill('good-domain.com\nnot a domain\npaid.io, 200');
    await expect(dialog.getByText('2 valid')).toBeVisible();
    await expect(dialog.getByText('1 invalid (skipped)')).toBeVisible();
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText(/Ingest 2 domains/);
  });
});
