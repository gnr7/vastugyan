import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'G:\\Vastugrid\\scratch\\chrome_profile_sidebar';

async function run() {
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173/', { method: 'PUT' });
      const data = await res.json();
      if (data && data.webSocketDebuggerUrl) {
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let idCounter = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });

  await new Promise(r => setTimeout(r, 1200));

  await send('Runtime.evaluate', {
    expression: `
      (async function() {
        const { addPolygonVertex, closePolygon } = await import('./js/state.js');
        const points = [
          { x: 100, y: 100 },
          { x: 700, y: 100 },
          { x: 700, y: 500 },
          { x: 100, y: 500 }
        ];
        points.forEach(p => window.store.setState(addPolygonVertex(p)));
        window.store.setState(closePolygon());
        // Scroll the sidebar down so the entire Positive Land Energy section is in view
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.scrollTop = 550;
      })()
    `,
    awaitPromise: true
  });

  await new Promise(r => setTimeout(r, 600));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('g:\\Vastugrid\\scratch\\browser_land_energy_scrolled.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Saved scratch/browser_land_energy_scrolled.png');

  ws.close();
  chromeProcess.kill();
}

run().catch(console.error);
