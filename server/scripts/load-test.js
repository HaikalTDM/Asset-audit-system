/* eslint-disable no-console */
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;

const DEFAULT_USERS = 10;
const DEFAULT_ASSESSMENTS = 100;
const DEFAULT_CONCURRENCY = 100;

const categories = ['Wall', 'Ceiling', 'Floor', 'Door', 'Window', 'HVAC', 'Electrical', 'Plumbing'];
const elements = ['Crack', 'Leak', 'Stain', 'Warp', 'Rust', 'Loose', 'Damage', 'Noise'];
const damageCategories = ['Wear', 'Moisture', 'Impact', 'Corrosion', 'Mechanical'];
const rootCauses = ['Age', 'Weather', 'Misuse', 'Installation', 'Unknown'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = process.argv[idx + 1];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message = data?.error || data?.message || `${res.status} ${res.statusText}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function createUser(index) {
  const stamp = Date.now();
  const email = `loadtest_user_${stamp}_${index}@example.com`;
  const password = 'Passw0rd!123';
  const displayName = `Load Test User ${index + 1}`;
  const role = 'staff';

  const data = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, role }),
  });

  return { email, password, token: data.token, user: data.user };
}

function buildAssessment() {
  return {
    created_at: Date.now(),
    building: `Block ${Math.floor(Math.random() * 5) + 1}`,
    floor: `L${Math.floor(Math.random() * 10) + 1}`,
    room: `R-${Math.floor(Math.random() * 200) + 1}`,
    category: pick(categories),
    element: pick(elements),
    condition: String(Math.floor(Math.random() * 5) + 1),
    priority: String(Math.floor(Math.random() * 5) + 1),
    damageCategory: pick(damageCategories),
    rootCause: pick(rootCauses),
    rootCauseDetails: 'Auto-generated load test data',
    notes: 'Load test assessment',
    latitude: (3.139 + Math.random() * 0.1).toFixed(6),
    longitude: (101.686 + Math.random() * 0.1).toFixed(6),
  };
}

async function createAssessment(token, payload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      form.append(key, value);
    }
  }
  return request('/assessments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let active = 0;
  let done = 0;
  const results = [];

  return new Promise((resolve, reject) => {
    const next = () => {
      if (done === items.length) return resolve(results);
      while (active < concurrency && idx < items.length) {
        const current = idx++;
        active++;
        Promise.resolve(worker(items[current], current))
          .then((result) => {
            results[current] = result;
          })
          .catch((err) => {
            results[current] = { error: err.message, status: err.status, data: err.data };
          })
          .finally(() => {
            active--;
            done++;
            next();
          });
      }
    };
    next();
  });
}

async function main() {
  const userCount = parseArg('users', DEFAULT_USERS);
  const totalAssessments = parseArg('assessments', DEFAULT_ASSESSMENTS);
  const concurrency = parseArg('concurrency', DEFAULT_CONCURRENCY);

  console.log(`API: ${API_BASE_URL}`);
  console.log(`Creating ${userCount} users...`);
  const users = [];
  for (let i = 0; i < userCount; i++) {
    users.push(await createUser(i));
  }
  console.log(`Created ${users.length} users.`);

  const jobs = Array.from({ length: totalAssessments }, (_, i) => i);
  const startedAt = Date.now();

  console.log(`Creating ${totalAssessments} assessments with concurrency ${concurrency}...`);
  const results = await runPool(
    jobs,
    async (jobIndex) => {
      const user = users[jobIndex % users.length];
      const payload = buildAssessment();
      return createAssessment(user.token, payload);
    },
    concurrency
  );

  const elapsed = (Date.now() - startedAt) / 1000;
  const failures = results.filter((r) => r && r.error);
  console.log(`Done in ${elapsed.toFixed(2)}s. Success: ${results.length - failures.length}, Failed: ${failures.length}`);
  if (failures.length) {
    console.log('Sample failures:', failures.slice(0, 5));
  }
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
