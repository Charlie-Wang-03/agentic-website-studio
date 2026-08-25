console.info('fixture-ready token=FIXTURE_SECRET');
fetch('/data.json').catch(() => undefined);
window.open('__PROBE_ORIGIN__/popup', '_blank');
new WebSocket('__PROBE_WS__/socket');
navigator.serviceWorker.register('/sw.js').catch(() => undefined);
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 40), { passive: true });
const canvas = document.querySelector('canvas');
const context = canvas?.getContext('2d');
if (context) { context.fillStyle = '#f4f7fb'; context.fillRect(48, 28, 64, 44); }
