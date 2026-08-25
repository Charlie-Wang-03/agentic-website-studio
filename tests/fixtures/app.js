console.info('fixture-ready token=FIXTURE_SECRET');
fetch('/data.json').catch(() => undefined);
window.open('__PROBE_ORIGIN__/popup', '_blank');
new WebSocket('__PROBE_WS__/socket');
navigator.serviceWorker.register('/sw.js').catch(() => undefined);
