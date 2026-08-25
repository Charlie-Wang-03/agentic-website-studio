import type { Page } from 'playwright';
import type { ViewportName, ViewportProfile } from './types.js';

export const VIEWPORTS: readonly ViewportProfile[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

export interface ViewportIntelligence {
  structure: unknown;
  visualSystem: unknown;
  motionInteraction: unknown;
  technicalSignals: Record<string, unknown>;
  scrollSweep: unknown;
  summary: { scrollHeight: number; horizontalOverflow: boolean; sectionCount: number; headingCount: number; fixedOrStickyCount: number };
}

export async function collectViewportIntelligence(page: Page, viewport: ViewportName): Promise<ViewportIntelligence> {
  const observed = await page.evaluate(() => {
    const round = (value: number): number => Math.round(value * 100) / 100;
    const visible = (element: Element): boolean => {
      const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const takeVisible = (selector: string, limit: number, inspectionLimit = 5_000): Element[] => {
      const result: Element[] = [];
      const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT); let inspected = 0; let node = walker.nextNode();
      while (node && inspected < inspectionLimit && result.length < limit) {
        const element = node as Element; if (element.matches(selector) && visible(element)) result.push(element);
        inspected += 1; node = walker.nextNode();
      }
      return result;
    };
    const boundedCount = (rootNode: Node, selector: string, limit: number, inspectionLimit = 10_000): number => {
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT); let inspected = 0; let count = 0; let node = walker.nextNode();
      while (node && inspected < inspectionLimit && count < limit) {
        if ((node as Element).matches(selector)) count += 1;
        inspected += 1; node = walker.nextNode();
      }
      return count;
    };
    const elements = takeVisible('*', 240);
    const top = (values: string[], limit = 12): Array<{ value: string; count: number }> => {
      const counts = new Map<string, number>();
      for (const value of values) if (value && value.length <= 300) counts.set(value, (counts.get(value) ?? 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([value, count]) => ({ value, count }));
    };
    const sectionNodes = takeVisible('header,nav,main,section,article,aside,footer,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"]', 40);
    const sections = sectionNodes.map((element, index) => {
      const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
      const heading = element.querySelector('h1,h2,h3,h4,h5,h6');
      return {
        index, semanticType: element.getAttribute('role') ?? element.tagName.toLowerCase(),
        heading: (heading?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
        box: { x: round(rect.x), y: round(rect.y + scrollY), width: round(rect.width), height: round(rect.height) },
        viewportTopRatio: round((rect.y + scrollY) / Math.max(document.documentElement.scrollHeight, 1)),
        descendantCount: boundedCount(element, '*', 500, 500),
        interactiveCount: boundedCount(element, 'a,button,input,select,textarea,[role="button"],[tabindex]', 100, 500),
        position: style.position, display: style.display,
      };
    });
    const headings = takeVisible('h1,h2,h3,h4,h5,h6', 40).map((element) => ({
      level: Number(element.tagName.slice(1)), text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
      fontSize: getComputedStyle(element).fontSize,
    }));
    const affordances = takeVisible('a,button,input,select,textarea,[role="button"]', 30).map((element) => ({
      role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      label: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
      cursor: getComputedStyle(element).cursor,
    }));
    const styles = elements.map((element) => getComputedStyle(element));
    const layoutModes = top(styles.map((style) => style.display), 10);
    const spacingValues: string[] = [];
    for (const style of styles) spacingValues.push(style.marginTop, style.marginRight, style.marginBottom, style.marginLeft, style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft, style.gap);
    const animationDurations = styles.flatMap((style) => style.animationDuration.split(',')).map((item) => item.trim()).filter((item) => item !== '0s');
    const transitionDurations = styles.flatMap((style) => style.transitionDuration.split(',')).map((item) => item.trim()).filter((item) => item !== '0s');
    const fixedOrSticky = elements.filter((element) => ['fixed', 'sticky'].includes(getComputedStyle(element).position));
    const root = document.documentElement;
    return {
      structure: {
        title: document.title.slice(0, 300), sections, headings,
        budgets: { visibleElementSample: 240, sections: 40, headings: 40, affordances: 30 },
        landmarkOrder: sectionNodes.map((element) => element.getAttribute('role') ?? element.tagName.toLowerCase()),
        counts: { links: boundedCount(document, 'a[href]', 10_000), buttons: boundedCount(document, 'button,[role="button"]', 10_000), forms: boundedCount(document, 'form', 1_000), images: boundedCount(document, 'img', 10_000), textBlocks: boundedCount(document, 'p,li,blockquote', 10_000) },
        scroll: { width: root.scrollWidth, height: root.scrollHeight, horizontalOverflow: root.scrollWidth > innerWidth + 1 },
        layoutModes, affordances,
      },
      visualSystem: {
        sampleSize: elements.length,
        colors: top(styles.flatMap((style) => [style.color, style.backgroundColor, style.borderColor]), 16),
        fontFamilies: top(styles.map((style) => style.fontFamily), 10),
        fontSizes: top(styles.map((style) => style.fontSize), 12),
        fontWeights: top(styles.map((style) => style.fontWeight), 10),
        lineHeights: top(styles.map((style) => style.lineHeight), 10),
        spacing: top(spacingValues.filter((value) => value !== '0px' && value !== 'normal'), 16),
        borderRadii: top(styles.map((style) => style.borderRadius).filter((value) => value !== '0px'), 10),
        borders: styles.filter((style) => [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some((value) => value !== '0px')).length,
        boxShadows: top(styles.map((style) => style.boxShadow).filter((value) => value !== 'none'), 10),
        opacities: top(styles.map((style) => style.opacity).filter((value) => value !== '1'), 10),
        textAlignments: top(styles.map((style) => style.textAlign), 8), layoutModes,
      },
      motionInteraction: {
        cssAnimationElementCount: styles.filter((style) => style.animationName !== 'none').length,
        animationDurations: top(animationDurations, 10), transitionElementCount: styles.filter((style) => style.transitionProperty !== 'all' || style.transitionDuration !== '0s').length,
        transitionDurations: top(transitionDurations, 10), activeAnimationCount: document.getAnimations().length,
        fixedOrStickyCount: fixedOrSticky.length, fixedOrSticky: fixedOrSticky.slice(0, 20).map((element) => ({ tag: element.tagName.toLowerCase(), position: getComputedStyle(element).position })),
        scrollSnapTypes: top(styles.map((style) => style.scrollSnapType).filter((value) => value !== 'none'), 8),
        canvasCount: boundedCount(document, 'canvas', 1_000), videoCount: boundedCount(document, 'video', 1_000), audioCount: boundedCount(document, 'audio', 1_000),
        affordances,
      },
      technicalSignals: {
        scriptCount: Math.min(document.scripts.length, 1_000), moduleScriptCount: boundedCount(document, 'script[type="module"]', 1_000),
        stylesheetCount: Math.min(document.styleSheets.length, 1_000),
        canvasCount: boundedCount(document, 'canvas', 1_000), mediaCount: boundedCount(document, 'video,audio', 1_000),
        generator: (document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? '').slice(0, 200),
        historyApiAvailable: typeof history.pushState === 'function',
      },
      summary: { scrollHeight: root.scrollHeight, horizontalOverflow: root.scrollWidth > innerWidth + 1, sectionCount: sections.length, headingCount: headings.length, fixedOrStickyCount: fixedOrSticky.length },
    };
  });

  const positions = [0, 0.5, 1];
  const states: unknown[] = [];
  for (const ratio of positions) {
    await page.evaluate((position) => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * position)), ratio);
    await page.waitForTimeout(150);
    states.push(await page.evaluate((position) => ({
      position, scrollY: Math.round(scrollY), scrollHeight: document.documentElement.scrollHeight,
      bodyClassTokenCount: document.body.classList.length, rootClassTokenCount: document.documentElement.classList.length,
      fixedOrStickyVisible: (() => {
        let inspected = 0; let count = 0;
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT); let node = walker.nextNode();
        while (node) {
          const element = node as Element;
          const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
          if (['fixed', 'sticky'].includes(style.position) && rect.width > 0 && rect.height > 0) count += 1;
          inspected += 1; if (inspected >= 500) break; node = walker.nextNode();
        }
        return count;
      })(),
    }), ratio));
  }
  await page.evaluate(() => scrollTo(0, 0));
  return { ...observed, scrollSweep: { viewport, positions: states } };
}
