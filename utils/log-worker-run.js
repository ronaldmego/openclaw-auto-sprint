const http = require('http');

const workerName = process.argv[2];
const ticketId = parseInt(process.argv[3]) || null;
const modelName = process.argv[4] || null;
const durationS = parseFloat(process.argv[5]) || 0;
const statusResult = process.argv[6] || 'ok';

const payload = {
  worker: workerName,
  ticket_id: ticketId,
  model: modelName,
  tokens_in: 0, // Not available from command line, setting to 0
  tokens_out: 0, // Not available from command line, setting to 0
  cost_usd: 0,   // Not available from command line, setting to 0
  duration_s: durationS,
  status: statusResult,
};

const postData = JSON.stringify(payload);

const options = {
  hostname: '100.64.216.28', // Tailscale IP of the OAS server
  port: 3401,
  path: '/api/worker-runs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Worker run logged successfully:', data);
    } else {
      console.error('Failed to log worker run. Status:', res.statusCode, 'Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error logging worker run:', e.message);
});

req.write(postData);
req.end();

