import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'G:\\Vastugrid\\scratch\\chrome_profile';

async function run() {
  console.log('Starting headless Chrome...');
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

  if (!wsUrl) {
    console.error('Failed to create target & get WebSocket debugger URL');
    chromeProcess.kill();
    return;
  }

  console.log('Connected to CDP target at:', wsUrl);
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

  // Set window / viewport size
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Wait for load
  await new Promise((resolve) => {
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', handler);
        resolve();
      }
    };
    ws.addEventListener('message', handler);
    // Timeout fallback
    setTimeout(resolve, 3000);
  });

  console.log('Page loaded. Waiting for UI initialization...');
  await new Promise(r => setTimeout(r, 1200));

  // Check initial state
  const initialData = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        hasStore: !!window.store,
        badge: document.getElementById('landEnergyBadge')?.textContent,
        income: document.getElementById('valLandIncome')?.textContent,
        expenditure: document.getElementById('valLandExpenditure')?.textContent,
        verdict: document.getElementById('tagLandVerdict')?.textContent
      })
    `,
    returnByValue: true
  });
  console.log('Initial DOM state:', initialData.result.value);

  // Trigger polygon creation (600 x 400 rect)
  const triggerRes = await send('Runtime.evaluate', {
    expression: `
      (async function() {
        if (!window.store) return 'Error: window.store not found';
        const { addPolygonVertex, closePolygon } = await import('./js/state.js');
        const points = [
          { x: 100, y: 100 },
          { x: 700, y: 100 },
          { x: 700, y: 500 },
          { x: 100, y: 500 }
        ];
        points.forEach(p => window.store.setState(addPolygonVertex(p)));
        window.store.setState(closePolygon());
        return 'Polygon closed successfully with 4 points!';
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Trigger action result:', triggerRes.result.value);

  // Wait for reactive subscriber update
  await new Promise(r => setTimeout(r, 600));

  // Check updated DOM state
  const updatedData = await send('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        badge: document.getElementById('landEnergyBadge')?.textContent,
        income: document.getElementById('valLandIncome')?.textContent,
        incomeFormula: document.getElementById('valLandIncomeFormula')?.textContent,
        expenditure: document.getElementById('valLandExpenditure')?.textContent,
        expenditureFormula: document.getElementById('valLandExpenditureFormula')?.textContent,
        incomeComparison: document.getElementById('titleIncomeComparison')?.textContent,
        energyPattern: document.getElementById('labelEnergyPattern')?.textContent,
        energyPatternDesc: document.getElementById('descEnergyPattern')?.textContent,
        lengthProportion: document.getElementById('labelLengthProportion')?.textContent,
        verdict: document.getElementById('tagLandVerdict')?.textContent,
        verdictSummary: document.getElementById('summaryLandVerdict')?.textContent
      })
    `,
    returnByValue: true
  });
  console.log('Updated DOM state:', JSON.parse(updatedData.result.value));

  // Capture screenshot of the full viewport
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('g:\\Vastugrid\\scratch\\browser_land_energy_verified.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Screenshot saved to scratch/browser_land_energy_verified.png');

  ws.close();
  chromeProcess.kill();
  console.log('Test completed successfully!');
}

run().catch(console.error);
