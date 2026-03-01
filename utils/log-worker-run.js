const http = require('http');

const OAS_HOST = '100.64.216.28';
const OAS_PORT = 3401;

// Parse args: supports both positional and --flag styles
// Positional: worker ticketId model durationS status
// Flags: --tracked --tokens-in=N --tokens-out=N --cost-usd=N
const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    flags[key] = val === undefined ? true : val;
  } else {
    positional.push(arg);
  }
}

const workerName = positional[0] || flags.worker;
const ticketId = parseInt(positional[1] || flags['ticket-id']) || null;
const modelName = positional[2] || flags.model || null;
const durationS = parseFloat(positional[3] || flags['duration-s']) || 0;
const statusResult = positional[4] || flags.status || 'ok';
const tokensIn = parseInt(flags['tokens-in']) || 0;
const tokensOut = parseInt(flags['tokens-out']) || 0;
const costUsd = parseFloat(flags['cost-usd']) || 0;
const tracked = !!flags.tracked;

if (!workerName) {
  console.error('Usage: node log-worker-run.js <worker> [ticketId] [model] [durationS] [status]');
  console.error('Flags: --tracked --tokens-in=N --tokens-out=N --cost-usd=N');
  process.exit(1);
}

function httpRequest(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: OAS_HOST,
      port: OAS_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function logDirect() {
  const payload = {
    worker: workerName,
    ticket_id: ticketId,
    model: modelName,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    duration_s: durationS,
    status: statusResult,
  };
  const result = await httpRequest('/api/worker-runs', payload);
  console.log('Worker run logged:', JSON.stringify(result));
}

async function logTracked() {
  // Step 1: Start tracked run
  const startResult = await httpRequest('/api/worker-runs/start', {
    worker: workerName,
    model: modelName,
    ticket_id: ticketId,
  });
  const runId = startResult.run_id;
  console.log(`Tracked run started: ${runId}`);

  // Step 2: Complete immediately (cron already finished before calling this)
  const completeResult = await httpRequest(`/api/worker-runs/${runId}/complete`, {
    status: statusResult,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    model: modelName,
  });
  console.log('Tracked run completed:', JSON.stringify(completeResult));
}

(tracked ? logTracked() : logDirect()).catch((err) => {
  console.error('Error logging worker run:', err.message);
  process.exit(1);
});
