import fs from 'node:fs/promises';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { preview, type PreviewServer } from 'vite';

const evidence = path.resolve('.tmp/wayfinder-evidence');
let previewServer: PreviewServer;
const expected = {
  edge: { route: 'Ridge-side traverse', atmosphere: 'Sheltered and close' },
  wait: { route: 'Marker hold', atmosphere: 'Still and watchful' },
  gap: { route: 'Open-gap crossing', atmosphere: 'Exposed and widening' },
} as const;

async function enterChoice(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start crossing' }).click();
  await page.getByRole('button', { name: 'I am ready' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'choice_prompt');
}

async function choose(page: Page, bearing: keyof typeof expected): Promise<void> {
  await page.getByRole('button', { name: new RegExp(bearing === 'edge' ? 'cool edge' : bearing === 'wait' ? 'Wait beside' : 'bright gap', 'i') }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', `consequence_${bearing}`);
  await expect(page.getByTestId('route')).toHaveText(expected[bearing].route);
  await expect(page.getByTestId('atmosphere')).toHaveText(expected[bearing].atmosphere);
}

test.beforeAll(async () => {
  await fs.mkdir(evidence, { recursive: true });
  previewServer = await preview({ configFile: path.resolve('vite.wayfinder.config.ts') });
});
test.afterAll(async () => { await previewServer.close(); });

test('desktop completes all branches, captures evidence, and restarts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.screenshot({ path: path.join(evidence, 'arrival-desktop.png'), fullPage: true });
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterChoice(page);
    if (bearing === 'edge') await page.screenshot({ path: path.join(evidence, 'choice-desktop.png'), fullPage: true });
    await choose(page, bearing);
    await page.screenshot({ path: path.join(evidence, `consequence-${bearing}-desktop.png`), fullPage: true });
    await page.getByRole('button', { name: 'Continue to reflection' }).click();
    await expect(page.locator('main')).toHaveAttribute('data-state', `ending_${bearing}`);
    await expect(page.getByTestId('ending')).not.toBeEmpty();
    if (bearing === 'gap') await page.screenshot({ path: path.join(evidence, 'ending-gap-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Restart the crossing' }).click();
    await expect(page.locator('main')).toHaveAttribute('data-state', 'arrival');
  }
});

test('mobile touch matrix is complete with no overflow or overlap', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterChoice(page);
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
    }
    await choose(page, bearing);
    await page.getByRole('button', { name: 'Continue to reflection' }).tap();
    await expect(page.locator('main')).toHaveAttribute('data-state', `ending_${bearing}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (bearing === 'wait') await page.screenshot({ path: path.join(evidence, 'ending-wait-mobile.png'), fullPage: true });
  }
  await context.close();
});

test('keyboard-only branch and bearing controls have logical visible focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start crossing' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Read the ground' })).toBeFocused();
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /cool edge/i })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: /Wait beside/i })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: /bright gap/i })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-state', 'arrival');
});

test('reduced motion preserves all branch outcomes without waiting for animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterChoice(page); await choose(page, bearing);
    await expect(page.locator(`.route-${bearing}`)).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'Continue to reflection' }).click();
    await expect(page.getByTestId('ending')).toBeVisible();
  }
  await page.screenshot({ path: path.join(evidence, 'ending-gap-reduced-motion.png'), fullPage: true });
});

test('representative desktop and mobile states have no serious axe violations', async ({ page, browser }) => {
  const scan = async (target: Page) => expect((await new AxeBuilder({ page: target }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.goto('/'); await scan(page);
  await enterChoice(page); await scan(page);
  await choose(page, 'edge'); await scan(page);
  await page.getByRole('button', { name: 'Continue to reflection' }).click(); await scan(page);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await context.newPage(); await enterChoice(mobile); await scan(mobile); await context.close();
});

test('production runtime makes no external request and emits no errors', async ({ page }) => {
  const external: string[] = []; const errors: string[] = [];
  page.on('request', (request) => { const url = new URL(request.url()); if (url.hostname !== '127.0.0.1') external.push(request.url()); });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await enterChoice(page); await choose(page, 'wait'); await page.getByRole('button', { name: 'Continue to reflection' }).click();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('fresh identical runs produce identical semantic output', async ({ browser }) => {
  async function run(): Promise<string[]> {
    const page = await browser.newPage(); const result: string[] = [];
    await enterChoice(page); result.push(await page.locator('main').getAttribute('data-state') ?? '');
    await choose(page, 'gap'); result.push(await page.getByTestId('route').innerText(), await page.getByTestId('atmosphere').innerText(), await page.getByTestId('consequence').innerText());
    await page.getByRole('button', { name: 'Continue to reflection' }).click(); result.push(await page.getByTestId('ending').innerText()); await page.close(); return result;
  }
  expect(await run()).toEqual(await run());
});
