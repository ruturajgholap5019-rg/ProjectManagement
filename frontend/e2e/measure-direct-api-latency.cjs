const API_BASE = 'https://project-tracker-backend-303t.onrender.com/api/v1';

async function measureDirectApiTimings() {
  console.log('--- Measuring Direct Production API Latencies ---');

  // Step 1: Login
  const loginStart = Date.now();
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@organization.com', password: 'Password123!' }),
  });
  const loginDuration = Date.now() - loginStart;
  const loginData = await loginRes.json();
  const token = loginData?.data?.accessToken;

  console.log(`[POST /auth/login] Status: ${loginRes.status} | Duration: ${loginDuration}ms`);

  if (!token) {
    console.error('Failed to get auth token');
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    { method: 'GET', path: '/auth/me' },
    { method: 'GET', path: '/dashboard' },
    { method: 'GET', path: '/categories' },
    { method: 'GET', path: '/projects?limit=10' },
    { method: 'GET', path: '/tasks/my' },
    { method: 'GET', path: '/activities?limit=10' },
    { method: 'GET', path: '/users?limit=10' },
    { method: 'GET', path: '/clients' },
    { method: 'GET', path: '/notifications' },
    { method: 'GET', path: '/search?q=project' },
  ];

  console.log('\n| Method | Endpoint                     | Status | Duration (ms) | Payload Size |');
  console.log('|--------|------------------------------|--------|---------------|--------------|');

  const latencies = [];

  for (const ep of endpoints) {
    const t0 = Date.now();
    const res = await fetch(`${API_BASE}${ep.path}`, {
      method: ep.method,
      headers: authHeaders,
    });
    const duration = Date.now() - t0;
    const text = await res.text();
    latencies.push(duration);
    console.log(`| ${ep.method.padEnd(6)} | ${ep.path.padEnd(28)} | ${String(res.status).padEnd(6)} | ${(duration + 'ms').padEnd(13)} | ${(text.length + ' B').padEnd(12)} |`);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p90 = latencies[Math.floor(latencies.length * 0.9)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  console.log('\n--- Direct API Benchmark ---');
  console.log(`Average Latency: ${avg}ms`);
  console.log(`p50 Latency:     ${p50}ms`);
  console.log(`p90 Latency:     ${p90}ms`);
}

measureDirectApiTimings();
