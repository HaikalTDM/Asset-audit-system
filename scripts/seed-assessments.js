const { v4: uuidv4 } = require('uuid');
const pool = require('../server/db');

const COUNT = Number(process.argv[2] || 100);
const DAYS = Number(process.argv[3] || 90);

const BUILDINGS = ['Wisma', 'Tower A', 'Tower B', 'Annex', 'Main Block'];
const FLOORS = ['1', '2', '3', '4', '5'];
const ROOMS = ['101', '202', '303', '404', '505'];
const CATEGORIES = ['Electrical', 'Mechanical', 'Structural', 'Plumbing', 'HVAC'];
const ELEMENTS = ['Lighting', 'Ventilation', 'Piping', 'Panels', 'Fixtures'];
const DAMAGE_TYPES = ['Structural Damage', 'Water Damage', 'Surface Defects', 'Functional Issues'];
const ROOT_CAUSES = ['Poor Maintenance', 'Material Deterioration', 'Weather', 'Wear and Tear'];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomDateWithinDays(days) {
  const now = Date.now();
  const rangeMs = days * 24 * 60 * 60 * 1000;
  return now - Math.floor(Math.random() * rangeMs);
}

async function main() {
  const [users] = await pool.query('SELECT id FROM users');
  if (!users.length) {
    console.error('No users found. Create a user first.');
    process.exit(1);
  }

  const values = [];
  for (let i = 0; i < COUNT; i += 1) {
    const userId = randomItem(users).id;
    const createdAt = randomDateWithinDays(DAYS);
    const condition = Math.floor(Math.random() * 5) + 1;
    const priority = Math.floor(Math.random() * 5) + 1;
    values.push([
      uuidv4(),
      userId,
      createdAt,
      randomItem(BUILDINGS),
      randomItem(FLOORS),
      randomItem(ROOMS),
      randomItem(CATEGORIES),
      randomItem(ELEMENTS),
      condition,
      priority,
      randomItem(DAMAGE_TYPES),
      randomItem(ROOT_CAUSES),
      '',
      'Seeded assessment',
      null,
      null,
      '',
      null,
      null,
    ]);
  }

  const sql = `
    INSERT INTO assessments
      (id, user_id, created_at, building, floor, room, category, element,
       condition_rating, priority_rating, damage_category, root_cause,
       root_cause_details, notes, latitude, longitude, photo_uri, photo_blob, photo_mime)
    VALUES ?
  `;

  await pool.query(sql, [values]);
  console.log(`Seeded ${COUNT} assessments across ${users.length} users (last ${DAYS} days).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
