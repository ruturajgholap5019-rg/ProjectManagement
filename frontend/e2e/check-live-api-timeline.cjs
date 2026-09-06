const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://vss-project-management.vercel.app';
const API_BASE = 'https://project-tracker-backend-303t.onrender.com/api/v1';

async function checkLiveApiTimeline() {
  console.log(`\n================================================================`);
  console.log(`🌐 LIVE PRODUCTION API TIMELINE AUDIT`);
  console.log(`Frontend: ${LIVE_URL}`);
  console.log(`Backend:  ${API_BASE}`);
  console.log(`================================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const apiCalls = [];
  const requestStartTimes = new Map();

  // Intercept all requests
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1')) {
      requestStartTimes.set(req, Date.now());
    }
  });

  page.on('response', async (res) => {
    const req = res.request();
    const url = req.url();
    if (url.includes('/api/v1')) {
      const startTime = requestStartTimes.get(req) || Date.now();
      const endTime = Date.now();
      const duration = endTime - startTime;
      const status = res.status();
      const method = req.method();
      const timing = res.request().timing();

      let bodySize = 0;
      try {
        const buffer = await res.body();
        bodySize = buffer.length;
      } catch (e) {
        // Ignored if streaming or aborted
      }

      const endpoint = url.replace(API_BASE, '');

      apiCalls.push({
        timestamp: new Date(startTime).toISOString().slice(11, 23),
        method,
        endpoint,
        status,
        duration,
        ttfb: Math.round(timing.responseStart - timing.requestStart) || null,
        bodySize,
        url,
      });

      const icon = status >= 200 && status < 400 ? '✅' : '❌';
      console.log(`[${icon} ${status}] ${method.padEnd(5)} ${endpoint.padEnd(45)} | ${duration}ms | ${(bodySize / 1024).toFixed(1)} KB`);
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/api/v1')) {
      const startTime = requestStartTimes.get(req) || Date.now();
      const duration = Date.now() - startTime;
      const endpoint = url.replace(API_BASE, '');
      console.log(`[❌ FAILED] ${req.method().padEnd(5)} ${endpoint.padEnd(45)} | Error: ${req.failure()?.errorText || 'Failed'}`);
      apiCalls.push({
        timestamp: new Date(startTime).toISOString().slice(11, 23),
        method: req.method(),
        endpoint,
        status: 0,
        duration,
        ttfb: null,
        bodySize: 0,
        error: req.failure()?.errorText || 'Failed',
        url,
      });
    }
  });

  try {
    // 1. Visit Root Page
    console.log('--- Step 1: Navigating to Live Application ---');
    const navStart = Date.now();
    await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`DOM loaded in ${Date.now() - navStart}ms`);

    // Give time for initial refresh attempt or redirect to login
    await page.waitForTimeout(2000);

    // 2. Authenticate
    console.log('\n--- Step 2: Logging in with Admin Credentials ---');
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.count() > 0) {
      await emailInput.fill('admin@organization.com');
      await passwordInput.fill('Password123!');
      const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
      await loginButton.click();

      // Wait for navigation / dashboard load
      await page.waitForTimeout(4000);
    } else {
      console.log('Already logged in or session restored.');
    }

    // 3. Inspect Dashboard
    console.log('\n--- Step 3: Inspecting Dashboard Telemetry ---');
    await page.waitForTimeout(3000);

    // 4. Navigate to Projects
    console.log('\n--- Step 4: Navigating to Projects ---');
    const projectsNav = page.locator('a:has-text("Projects"), button:has-text("Projects"), [data-nav="projects"]').first();
    if (await projectsNav.count() > 0) {
      await projectsNav.click();
      await page.waitForTimeout(3000);

      // Check first project detail
      console.log('\n--- Step 5: Opening First Project Detail ---');
      const firstProject = page.locator('table tbody tr, .project-card, [data-testid="project-row"]').first();
      if (await firstProject.count() > 0) {
        await firstProject.click();
        await page.waitForTimeout(3000);
      }
    }

    // 5. Navigate to My Tasks
    console.log('\n--- Step 6: Navigating to My Tasks ---');
    const tasksNav = page.locator('a:has-text("My Tasks"), button:has-text("My Tasks"), a:has-text("Tasks"), [data-nav="tasks"]').first();
    if (await tasksNav.count() > 0) {
      await tasksNav.click();
      await page.waitForTimeout(3000);
    }

    // 6. Navigate to Work Activities
    console.log('\n--- Step 7: Navigating to Work Activities ---');
    const activitiesNav = page.locator('a:has-text("Activities"), button:has-text("Activities"), a:has-text("Work Activities"), [data-nav="activities"]').first();
    if (await activitiesNav.count() > 0) {
      await activitiesNav.click();
      await page.waitForTimeout(3000);
    }

    // 7. Navigate to Users Directory
    console.log('\n--- Step 8: Navigating to Users Directory ---');
    const usersNav = page.locator('a:has-text("Users"), button:has-text("Users"), a:has-text("Team"), [data-nav="users"]').first();
    if (await usersNav.count() > 0) {
      await usersNav.click();
      await page.waitForTimeout(3000);
    }

    // 8. Navigate to My Account
    console.log('\n--- Step 9: Navigating to My Account ---');
    const accountNav = page.locator('a:has-text("My Account"), button:has-text("Account"), a:has-text("Profile"), [data-nav="account"]').first();
    if (await accountNav.count() > 0) {
      await accountNav.click();
      await page.waitForTimeout(2500);
    }

    // 9. Global Search
    console.log('\n--- Step 10: Triggering Global Search ---');
    const searchTrigger = page.locator('input[placeholder*="Search" i], button:has-text("Search"), [data-testid="search-btn"]').first();
    if (await searchTrigger.count() > 0) {
      await searchTrigger.click();
      await page.waitForTimeout(1000);
      const searchInput = page.locator('input[placeholder*="Search" i]').last();
      if (await searchInput.count() > 0) {
        await searchInput.fill('Project');
        await page.waitForTimeout(2500);
      }
    }

  } catch (err) {
    console.error('Audit encounter error:', err);
  } finally {
    await browser.close();
  }

  // Generate Summary Report
  console.log('\n================================================================');
  console.log('📊 LIVE PRODUCTION API TIMELINE REPORT');
  console.log('================================================================');

  if (apiCalls.length === 0) {
    console.log('No API calls were intercepted. Check domain routing or SSL.');
    return;
  }

  console.log(`Total API Requests Intercepted: ${apiCalls.length}\n`);

  console.log('| Timestamp | Method | Endpoint                                      | Status | Latency  | TTFB     | Payload  |');
  console.log('|-----------|--------|-----------------------------------------------|--------|----------|----------|----------|');
  for (const call of apiCalls) {
    const ttfbStr = call.ttfb !== null ? `${call.ttfb}ms` : 'N/A';
    console.log(`| ${call.timestamp} | ${call.method.padEnd(6)} | ${call.endpoint.padEnd(45)} | ${String(call.status).padEnd(6)} | ${(call.duration + 'ms').padEnd(8)} | ${ttfbStr.padEnd(8)} | ${(call.bodySize + ' B').padEnd(8)} |`);
  }

  const validDurations = apiCalls.filter(c => c.status >= 200 && c.status < 400).map(c => c.duration).sort((a, b) => a - b);
  if (validDurations.length > 0) {
    const p50 = validDurations[Math.floor(validDurations.length * 0.5)];
    const p90 = validDurations[Math.floor(validDurations.length * 0.9)];
    const p95 = validDurations[Math.floor(validDurations.length * 0.95)] || validDurations[validDurations.length - 1];
    const avg = Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length);
    const min = validDurations[0];
    const max = validDurations[validDurations.length - 1];

    console.log('\n--- Latency Breakdown (Successful Requests) ---');
    console.log(`Fastest: ${min}ms`);
    console.log(`Average: ${avg}ms`);
    console.log(`Median (p50): ${p50}ms`);
    console.log(`p90: ${p90}ms`);
    console.log(`p95: ${p95}ms`);
    console.log(`Slowest (Max): ${max}ms`);
  }

  const failedCalls = apiCalls.filter(c => c.status >= 400 || c.status === 0);
  if (failedCalls.length > 0) {
    console.log('\n--- ⚠️ Failed / Unauthorized Requests ---');
    for (const f of failedCalls) {
      console.log(`[Status ${f.status}] ${f.method} ${f.endpoint} - Duration: ${f.duration}ms ${f.error ? `(${f.error})` : ''}`);
    }
  } else {
    console.log('\n✅ Zero API failures detected!');
  }

  // Save report to artifacts
  const reportPath = path.resolve('C:/Users/ghola/.gemini/antigravity-ide/brain/d5396b86-4d81-4d2b-b7b3-621c37e4057d/live_api_timeline.json');
  fs.writeFileSync(reportPath, JSON.stringify(apiCalls, null, 2));
  console.log(`\nDetailed timeline data saved to: ${reportPath}`);
}

checkLiveApiTimeline();
