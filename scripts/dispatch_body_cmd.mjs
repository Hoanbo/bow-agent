// scripts/dispatch_body_cmd.mjs
const capability = process.argv[2];
let params = {};
if (process.env.CMD_PARAMS) {
  params = JSON.parse(process.env.CMD_PARAMS);
} else if (process.argv[3]) {
  try {
    params = JSON.parse(process.argv[3]);
  } catch {
    params = {};
  }
}
const bodyId = process.argv[4] || 'desktop_xeon_desktopedffnvt';

try {
  const res = await fetch('http://127.0.0.1:4000/api/body/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bodyId, capability, params }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Failed to dispatch command:', err);
  process.exit(1);
}
