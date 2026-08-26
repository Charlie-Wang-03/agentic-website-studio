import fs from 'node:fs/promises';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { preview, type PreviewServer } from 'vite';

const evidence = path.resolve('.tmp/wayfinder-evidence-m42r');
let previewServer: PreviewServer;
const expected = {
  edge: { hotspot: /Ridge edge/i, geometry: 'ridge_dominant_narrow_aperture', marker: 'marker_near_behind_bend', environment: 'Sheltered, close, partly occluded', enact: 'Follow the sheltered bend' },
  wait: { hotspot: /Stone marker/i, geometry: 'fixed_view_moving_light_cross_route', marker: 'marker_fixed_shadow_rotating', environment: 'Stationary, lowering light, newly legible', enact: 'Stay through the changing light' },
  gap: { hotspot: /Open gap/i, geometry: 'banks_receding_wide_aperture', marker: 'marker_small_and_receding', environment: 'Exposed, widening, wind-crossed', enact: 'Cross the open ground' },
} as const;

async function enterSurvey(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the crossing' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'approach');
  await page.getByRole('button', { name: /Walk into the marker/i }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'survey');
  await expect(page.getByRole('group', { name: 'Inspect the three bearings' })).toBeVisible();
}

async function previewBearing(page: Page, bearing: keyof typeof expected): Promise<void> {
  await page.getByRole('button', { name: expected[bearing].hotspot }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', `deliberation_${bearing}`);
  await expect(page.locator('main')).toHaveAttribute('data-preview', bearing);
  await expect(page.locator('main')).toHaveAttribute('data-bearing', 'none');
  await expect(page.locator('#tradeoff')).toBeVisible();
  await expect(page.getByText('Offers', { exact: true })).toBeVisible();
  await expect(page.getByText('Costs', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`Commit to ${bearing === 'wait' ? 'stone marker' : bearing === 'edge' ? 'ridge edge' : 'open gap'}`, 'i') })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to the crossing' })).toBeHidden();
}

async function commitBearing(page: Page, bearing: keyof typeof expected): Promise<void> {
  await page.getByRole('button', { name: /^Commit to/i }).click();
  const root = page.locator('main');
  await expect(root).toHaveAttribute('data-state', `response_${bearing}`);
  await expect(root).toHaveAttribute('data-bearing', bearing);
  await expect(root).toHaveAttribute('data-geometry', expected[bearing].geometry);
  await expect(root).toHaveAttribute('data-marker-relationship', expected[bearing].marker);
  await expect(page.locator('#environment-label')).toHaveText(expected[bearing].environment);
  await expect(page.locator(`[data-testid="route-${bearing}"]`)).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: expected[bearing].enact })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Look back from here' })).toBeHidden();
}

test.beforeAll(async () => {
  await fs.mkdir(evidence, { recursive: true });
  previewServer = await preview({ configFile: path.resolve('vite.wayfinder.config.ts') });
});
test.afterAll(async () => { await previewServer.close(); });

test('desktop sequence supports observation, reversible deliberation, explicit commit, response, continuation, and restart', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.screenshot({ path: path.join(evidence, '01-arrival-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Enter the crossing' }).click();
  await page.screenshot({ path: path.join(evidence, '02-approach-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: /Walk into the marker/i }).click();
  await page.screenshot({ path: path.join(evidence, '03-survey-desktop.png'), fullPage: true });
  await page.locator('#world-shell').evaluate((element) => { (element as HTMLElement).dataset.continuityProbe = 'persistent'; });
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await previewBearing(page, bearing);
    await page.screenshot({ path: path.join(evidence, `04-preview-${bearing}-desktop.png`), fullPage: true });
    await expect(page.locator('#world-shell')).toHaveAttribute('data-continuity-probe', 'persistent');
  }
  await previewBearing(page, 'edge');
  await commitBearing(page, 'edge');
  await expect(page.locator('#world-shell')).toHaveAttribute('data-continuity-probe', 'persistent');
  await page.screenshot({ path: path.join(evidence, '05-response-edge-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: expected.edge.enact }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'continuation_edge');
  await expect(page.getByRole('button', { name: 'Look back from here' })).toBeVisible();
  await page.screenshot({ path: path.join(evidence, '06-continuation-edge-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Look back from here' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'ending_edge');
  await page.screenshot({ path: path.join(evidence, '07-ending-edge-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Return to the crossing' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-state', 'arrival');
});

test('every bearing changes multiple world relationships before reflection and requires continuation', async ({ page }) => {
  const signatures = new Set<string>();
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterSurvey(page); await previewBearing(page, bearing);
    await page.locator('#world-shell').evaluate((element) => { (element as HTMLElement).dataset.continuityProbe = 'persistent'; });
    await commitBearing(page, bearing);
    await expect(page.locator('#world-shell')).toHaveAttribute('data-continuity-probe', 'persistent');
    const signature = await page.locator('main').evaluate((element, activeBearing) => [element.getAttribute('data-geometry'), element.getAttribute('data-marker-relationship'), getComputedStyle(document.querySelector(`[data-testid="route-${activeBearing}"]`)!).opacity, getComputedStyle(document.querySelector('[data-testid="ridge-left"]')!).transform, getComputedStyle(document.querySelector('[data-testid="marker"]')!).transform].join('|'), bearing);
    signatures.add(signature);
    await expect(page.locator('[data-phase="response"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Look back from here' })).toBeHidden();
    await page.screenshot({ path: path.join(evidence, `08-response-${bearing}-desktop.png`), fullPage: true });
    await page.getByRole('button', { name: expected[bearing].enact }).click();
    await expect(page.locator('main')).toHaveAttribute('data-state', `continuation_${bearing}`);
    await expect(page.locator('main')).not.toHaveAttribute('data-state', `ending_${bearing}`);
  }
  expect(signatures.size).toBe(3);
});

test('mobile touch matrix preserves the full revised experience without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterSurvey(page);
    await page.getByRole('button', { name: expected[bearing].hotspot }).tap();
    await page.getByRole('button', { name: /^Commit to/i }).tap();
    await expect(page.locator('main')).toHaveAttribute('data-state', `response_${bearing}`);
    await page.getByRole('button', { name: expected[bearing].enact }).tap();
    await page.getByRole('button', { name: 'Look back from here' }).tap();
    await expect(page.locator('main')).toHaveAttribute('data-state', `ending_${bearing}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const button of await page.getByRole('button').all()) if (await button.isVisible()) expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
    if (bearing === 'wait') await page.screenshot({ path: path.join(evidence, '09-ending-wait-mobile.png'), fullPage: true });
  }
  await context.close();
});

test('keyboard-only play can compare previews, commit, continue, reflect, and restart', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Enter the crossing' })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'The last track disappears' })).toBeFocused(); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: expected.edge.hotspot })).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: expected.wait.hotspot })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-preview', 'wait');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: expected.gap.hotspot })).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: /^Commit to/i })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-state', 'response_gap');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-state', 'continuation_gap');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toHaveAttribute('data-state', 'arrival');
});

test('reduced motion preserves preview, world response, continuation, and ending', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const bearing of Object.keys(expected) as Array<keyof typeof expected>) {
    await enterSurvey(page); await previewBearing(page, bearing); await commitBearing(page, bearing);
    await expect(page.locator(`[data-testid="route-${bearing}"]`)).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: expected[bearing].enact }).click(); await page.getByRole('button', { name: 'Look back from here' }).click();
    await expect(page.locator('main')).toHaveAttribute('data-state', `ending_${bearing}`);
  }
  await page.screenshot({ path: path.join(evidence, '10-ending-gap-reduced-motion.png'), fullPage: true });
});

test('representative revised states have no serious or critical axe violations', async ({ page, browser }) => {
  const scan = async (target: Page) => expect((await new AxeBuilder({ page: target }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.goto('/'); await scan(page);
  await enterSurvey(page); await scan(page);
  await previewBearing(page, 'wait'); await scan(page);
  await commitBearing(page, 'wait'); await scan(page);
  await page.getByRole('button', { name: expected.wait.enact }).click(); await scan(page);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await context.newPage(); await enterSurvey(mobile); await previewBearing(mobile, 'gap'); await scan(mobile); await context.close();
});

test('production runtime stays local and emits no console or page errors', async ({ page }) => {
  const external: string[] = []; const errors: string[] = [];
  page.on('request', (request) => { const url = new URL(request.url()); if (url.hostname !== '127.0.0.1') external.push(request.url()); });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await enterSurvey(page); await previewBearing(page, 'edge'); await commitBearing(page, 'edge');
  await page.getByRole('button', { name: expected.edge.enact }).click(); await page.getByRole('button', { name: 'Look back from here' }).click();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('fresh identical revised runs produce identical semantic and world output', async ({ browser }) => {
  async function run(): Promise<string[]> {
    const page = await browser.newPage(); await enterSurvey(page); await previewBearing(page, 'gap'); await commitBearing(page, 'gap');
    const result = [await page.locator('main').getAttribute('data-state') ?? '', await page.locator('main').getAttribute('data-geometry') ?? '', await page.locator('#environment-label').innerText(), await page.locator('#story-body').innerText()];
    await page.getByRole('button', { name: expected.gap.enact }).click(); result.push(await page.locator('#story-body').innerText());
    await page.getByRole('button', { name: 'Look back from here' }).click(); result.push(await page.locator('#story-body').innerText()); await page.close(); return result;
  }
  expect(await run()).toEqual(await run());
});
