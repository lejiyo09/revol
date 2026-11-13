// 2단계: 원격 브라우저 (Playwright + Chromium)
// 서버에서 실제 Chromium을 띄우고 CDP로 화면을 JPEG 스트리밍, 입력은 역방향 전달.
// 접속 IP가 실제 브라우저라 Ultraviolet 프록시가 못 뚫는 로그인(네이버 등)도 통과 가능.

const { chromium } = require('playwright');

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
      ],
    }).catch((e) => { browserPromise = null; throw e; });
  }
  const b = await browserPromise;
  if (!b.isConnected()) { browserPromise = null; return getBrowser(); }
  return b;
}

async function handleRemoteConnection(ws) {
  const send = (obj) => { try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {} };
  let context, page, cdp;

  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });
    page = await context.newPage();
    cdp = await context.newCDPSession(page);

    cdp.on('Page.screencastFrame', async (frame) => {
      send({ type: 'frame', data: frame.data });
      try { await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }); } catch {}
    });

    page.on('framenavigated', (f) => { if (f === page.mainFrame()) send({ type: 'url', url: f.url() }); });
    page.on('load', async () => { send({ type: 'url', url: page.url(), title: await page.title().catch(() => '') }); });

    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
    send({ type: 'ready' });
  } catch (e) {
    send({ type: 'error', message: String((e && e.message) || e) });
    try { ws.close(); } catch {}
    return;
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    try {
      switch (msg.type) {
        case 'mouse':
          await cdp.send('Input.dispatchMouseEvent', {
            type: msg.action, x: msg.x, y: msg.y,
            button: msg.button || 'left', clickCount: msg.clickCount || 1,
          });
          break;
        case 'scroll':
          await cdp.send('Input.dispatchMouseEvent', {
            type: 'mouseWheel', x: msg.x, y: msg.y,
            deltaX: msg.deltaX || 0, deltaY: msg.deltaY || 0,
          });
          break;
        case 'key':
          await cdp.send('Input.dispatchKeyEvent', {
            type: msg.action, key: msg.key, code: msg.code, text: msg.text || '',
          });
          break;
        case 'navigate': {
          let url = (msg.url || '').trim();
          if (!/^https?:\/\//.test(url)) url = 'https://' + url;
          await page.goto(url, { waitUntil: 'domcontentloaded' })
            .catch((e) => send({ type: 'error', message: String(e && e.message) }));
          break;
        }
      }
    } catch { /* 입력 하나의 실패로 세션을 끊지 않는다 */ }
  });

  const cleanup = async () => {
    try { await cdp.send('Page.stopScreencast'); } catch {}
    try { await context.close(); } catch {}
  };
  ws.on('close', cleanup);
  ws.on('error', cleanup);
}

module.exports = { handleRemoteConnection, getBrowser };
