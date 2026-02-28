const http = require(http);

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split(=);
  acc[key] = value;
  return acc;
}, {});

const payload = {
  worker: args.worker,
  ticket_id: parseInt(args.ticket_id) || null,
  model: args.model || null,
  tokens_in: parseInt(args.tokens_in) || 0,
  tokens_out: parseInt(args.tokens_out) || 0,
  cost_usd: parseFloat(args.cost_usd) || 0,
  duration_s: parseFloat(args.duration_s) || 0,
  status: args.status || ok,
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 100.64.216.28, // Tailscale IP of the OAS server
  port: 3401,
  path: /api/worker-runs,
  method: POST,
  headers: {
    Content-Type: application/json,
    Content-Length: Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = ;
  res.on(data, (chunk) => {
    data += chunk;
  });
  res.on(end, () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(Worker run logged successfully:, data);
    } else {
      console.error(Failed to log worker run. Status:, res.statusCode, Response:, data);
    }
  });
});

req.on(error, (e) => {
  console.error(Error logging worker run:, e.message);
});

req.write(postData);
req.end();

