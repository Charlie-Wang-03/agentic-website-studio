import fs from 'node:fs/promises';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';
import { preview, type PreviewServer } from 'vite';

const evidence = path.resolve('.tmp/wayfinder-evidence-m43');
let server: PreviewServer;
const names = { en: [['Ridge edge','Stone marker','Open gap'],['Read the pools','Build a marker','Use the current'],['Turn toward the markers','Raise the dusk signal','Cross the dark saddle']], zh: [['贴着山脊','留在石标旁','穿过开阔地'],['细看静水','垒一座新石标','顺着水流'],['转向来时的地标','点起黄昏信号','越过黑暗的鞍部']] } as const;
const bearingIndex = { edge: 0, wait: 1, gap: 2 } as const;
type Bearing = keyof typeof bearingIndex;

async function begin(page: Page): Promise<void> { await page.goto('/'); await page.getByRole('button',{name:'Enter the crossing'}).click(); await page.getByRole('button',{name:/Walk into the marker/}).click(); await expect(page.locator('main')).toHaveAttribute('data-phase','deliberation'); }
async function choose(page: Page, act: number, bearing: Bearing, locale: 'en'|'zh'='en'): Promise<void> {
  await page.getByRole('button',{name:new RegExp(names[locale][act-1]![bearingIndex[bearing]]!)}).click();
  await expect(page.locator('main')).toHaveAttribute('data-preview',bearing); await expect(page.locator('#tradeoff')).toBeVisible();
  await page.locator('#commit-action').click(); await expect(page.locator('main')).toHaveAttribute('data-phase','response'); await expect(page.locator('main')).toHaveAttribute(`data-${['first','second','third'][act-1]}`,bearing);
  await page.locator('#enact-action').click(); await expect(page.locator('main')).toHaveAttribute('data-phase','travel');
  await page.locator(act < 3 ? '#arrive-action' : '#reflect-action').click();
}
async function journey(page: Page, history: readonly Bearing[], locale: 'en'|'zh'='en'): Promise<void> { await begin(page); for (let i=0;i<3;i++) await choose(page,i+1,history[i]!,locale); await expect(page.locator('main')).toHaveAttribute('data-phase','ending'); }

test.beforeAll(async()=>{ await fs.mkdir(evidence,{recursive:true}); server=await preview({configFile:path.resolve('vite.wayfinder.config.ts')}); });
test.afterAll(async()=>{ await server.close(); });

for (const viewport of [{name:'compact',width:1024,height:768},{name:'standard',width:1440,height:900},{name:'wide',width:1920,height:1080}]) {
  test(`${viewport.name} desktop completes a mixed full journey without critical overlap`,async({page})=>{ await page.setViewportSize(viewport); await journey(page,['edge','wait','gap']); await expect(page.locator('#journey-recap li')).toHaveCount(3); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true); await page.screenshot({path:path.join(evidence,`${viewport.name}-ending.png`),fullPage:true}); });
}

test('representative edge-heavy, wait-heavy, gap-heavy, and divergent histories integrate',async({page})=>{
  const histories: Bearing[][]=[['edge','edge','edge'],['wait','wait','wait'],['gap','gap','gap'],['edge','gap','wait'],['gap','edge','wait']]; const signatures=new Set<string>();
  for(const history of histories){ await journey(page,history); signatures.add((await page.locator('main').getAttribute('data-signature'))!); await page.locator('#restart-action').click(); }
  expect(signatures.size).toBe(histories.length);
});

test('language switching preserves preview, history, act, accessibility names, and html lang',async({page})=>{
  await begin(page); await page.getByRole('button',{name:'Stone marker'}).click(); const before=await page.locator('main').getAttribute('data-signature'); await page.getByRole('button',{name:'中文'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN'); await expect(page.locator('main')).toHaveAttribute('data-preview','wait'); await expect(page.locator('main')).toHaveAttribute('data-history','none'); await expect(page.locator('main')).toHaveAttribute('data-signature',before!); await expect(page.getByRole('button',{name:/决定：留在石标旁/})).toBeVisible();
  await page.locator('#commit-action').click(); await page.locator('#enact-action').click(); await page.locator('#arrive-action').click(); await choose(page,2,'gap','zh'); await expect(page.locator('main')).toHaveAttribute('data-history','wait-gap'); await page.getByRole('button',{name:'EN'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','en'); await expect(page.locator('main')).toHaveAttribute('data-act','3'); await expect(page.locator('main')).toHaveAttribute('data-history','wait-gap'); await expect(page.getByRole('group',{name:'Inspect three final commitments'})).toBeVisible();
});

test('Chinese completes a full journey with localized live announcements',async({page})=>{ await page.goto('/'); await page.getByRole('button',{name:'中文'}).click(); await page.getByRole('button',{name:'走进岔地'}).click(); await page.getByRole('button',{name:'走到石标的影子里'}).click(); await choose(page,1,'wait','zh'); await page.screenshot({path:path.join(evidence,'zh-act-2.png'),fullPage:true}); await choose(page,2,'edge','zh'); await page.screenshot({path:path.join(evidence,'zh-act-3.png'),fullPage:true}); await choose(page,3,'gap','zh'); await expect(page.locator('#route-announcement')).toHaveAttribute('lang','zh-CN'); await expect(page.locator('#journey-recap li')).toHaveCount(3); await page.screenshot({path:path.join(evidence,'zh-ending.png'),fullPage:true}); });

test('keyboard controls observation, preview, commit, continuation, language, ending, and restart',async({page})=>{
  await page.goto('/'); await page.getByRole('button',{name:'Enter the crossing'}).focus(); await page.keyboard.press('Enter'); await page.getByRole('button',{name:/Walk into/}).focus(); await page.keyboard.press('Enter');
  for(let act=1;act<=3;act++){ const choice=page.getByRole('button',{name:new RegExp(names.en[act-1]![act-1]!) }); await choice.focus(); await page.keyboard.press('Enter'); await page.locator('#commit-action').focus(); await page.keyboard.press('Enter'); await page.locator('#enact-action').focus(); await page.keyboard.press('Enter'); await page.locator(act<3?'#arrive-action':'#reflect-action').focus(); await page.keyboard.press('Enter'); }
  await page.getByRole('button',{name:'中文'}).focus(); await page.keyboard.press('Enter'); await expect(page.locator('html')).toHaveAttribute('lang','zh-CN'); await page.locator('#restart-action').focus(); await page.keyboard.press('Enter'); await expect(page.locator('main')).toHaveAttribute('data-phase','arrival');
});

test('reduced motion preserves the full state path and world memory',async({page})=>{ await page.emulateMedia({reducedMotion:'reduce'}); await journey(page,['gap','wait','edge']); await expect(page.locator('.route-1.gap')).toHaveCSS('opacity','0.9'); await expect(page.locator('.route-2.wait')).toHaveCSS('opacity','0.9'); await expect(page.locator('.route-3.edge')).toHaveCSS('opacity','0.9'); });

test('representative states in both languages have no serious or critical axe violations',async({page})=>{ const scan=async()=>expect((await new AxeBuilder({page}).analyze()).violations.filter((v)=>['serious','critical'].includes(v.impact??''))).toEqual([]); await page.goto('/'); await scan(); await begin(page); await scan(); await page.getByRole('button',{name:'中文'}).click(); await scan(); await page.getByRole('button',{name:'留在石标旁'}).click(); await scan(); });

test('production runtime stays local and emits no console or page errors',async({page})=>{ const external:string[]=[]; const errors:string[]=[]; page.on('request',(request)=>{const url=new URL(request.url());if(url.hostname!=='127.0.0.1')external.push(request.url());}); page.on('console',(message)=>{if(message.type()==='error')errors.push(message.text());}); page.on('pageerror',(error)=>errors.push(error.message)); await journey(page,['edge','gap','wait']); expect(external).toEqual([]); expect(errors).toEqual([]); });

test('fresh identical browser runs replay deterministically',async({browser})=>{ async function run(){const page=await browser.newPage();await journey(page,['wait','gap','edge']);const result=[await page.locator('main').getAttribute('data-signature'),await page.locator('#story-body').innerText(),await page.locator('#journey-recap').innerText()];await page.close();return result;} expect(await run()).toEqual(await run()); });
