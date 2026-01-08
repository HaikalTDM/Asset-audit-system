const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');
const { authenticate, requireAdmin } = require('./middleware/auth');
const { ensureDir, safeUnlink, uploadsRoot } = require('./utils/files');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const uploadsDir = uploadsRoot();
const assessmentDir = path.join(uploadsDir, 'assessments');
const profileDir = path.join(uploadsDir, 'profiles');
ensureDir(assessmentDir);
ensureDir(profileDir);

app.use('/uploads', express.static(uploadsDir));

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profileDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const profileUpload = multer({ storage: profileStorage });
const assessmentUpload = multer({ storage: multer.memoryStorage() });

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

async function getUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function getUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

function mapUser(row) {
  if (!row) return null;
  const photoUrl = row.photo_url
    ? (row.photo_url.startsWith('http') ? row.photo_url : `${BASE_URL}${row.photo_url}`)
    : '';
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    photoUrl,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAssessment(row) {
  if (!row) return null;
  const hasBlob = row.has_photo === 1 || row.has_photo === true;
  const rawPhoto = row.photo_url || row.photo_uri || '';
  const photoUrl = hasBlob
    ? `${BASE_URL}/assessments/${row.id}/photo`
    : (rawPhoto && !rawPhoto.startsWith('http') ? `${BASE_URL}${rawPhoto}` : rawPhoto);
  return {
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    building: row.building || '',
    floor: row.floor || '',
    room: row.room || '',
    category: row.category,
    element: row.element,
    condition_rating: row.condition_rating,
    priority_rating: row.priority_rating,
    damage_category: row.damage_category || '',
    root_cause: row.root_cause || '',
    root_cause_details: row.root_cause_details || '',
    notes: row.notes || '',
    latitude: row.latitude,
    longitude: row.longitude,
    photo_uri: photoUrl || '',
  };
}

app.get('/health', (req, res) => res.json({ ok: true }));

// Auth
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const id = uuidv4();
    const now = Date.now();
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = 'staff';
    await pool.query(
      `INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, displayName, userRole, 1, now, now]
    );
    const user = await getUserById(id);
    const token = signToken(user);
    return res.json({ token, user: mapUser(user) });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account inactive' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token, user: mapUser(user) });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/me', authenticate, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: mapUser(user) });
});

app.patch('/me', authenticate, async (req, res) => {
  const { displayName } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const nextName = displayName || user.display_name;
  await pool.query('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?', [nextName, Date.now(), user.id]);
  const updated = await getUserById(user.id);
  return res.json({ user: mapUser(updated) });
});

app.post('/me/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid current password' });
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, Date.now(), user.id]);
  return res.json({ ok: true });
});

app.post('/me/photo', authenticate, profileUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing photo' });
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.photo_url) {
      const prevPath = path.join(uploadsDir, user.photo_url.replace('/uploads/', ''));
      safeUnlink(prevPath);
    }
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    await pool.query('UPDATE users SET photo_url = ?, updated_at = ? WHERE id = ?', [photoUrl, Date.now(), user.id]);
    return res.json({ photoUrl: `${BASE_URL}${photoUrl}` });
  } catch (err) {
    console.error('Photo upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Admin users
app.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return res.json({ users: rows.map(mapUser) });
});

app.post('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body || {};
    if (!email || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });
    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const id = uuidv4();
    const now = Date.now();
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'staff';
    await pool.query(
      `INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, displayName, userRole, 1, now, now]
    );
    const user = await getUserById(id);
    return res.json({ user: mapUser(user) });
  } catch (err) {
    console.error('Admin create user error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, isActive, displayName } = req.body || {};
  const user = await getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const nextRole = role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : user.role;
  const nextActive = typeof isActive === 'boolean' ? (isActive ? 1 : 0) : user.is_active;
  const nextName = displayName || user.display_name;
  await pool.query(
    'UPDATE users SET role = ?, is_active = ?, display_name = ?, updated_at = ? WHERE id = ?',
    [nextRole, nextActive, nextName, Date.now(), id]
  );
  const updated = await getUserById(id);
  return res.json({ user: mapUser(updated) });
});

app.post('/admin/users/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const tempPassword = `Temp-${Math.random().toString(36).slice(2, 10)}`;
  const hash = await bcrypt.hash(tempPassword, 10);
  await pool.query('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, Date.now(), id]);
  return res.json({ tempPassword });
});

app.delete('/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = await getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ ok: true });
});

// Assessments
app.get('/assessments', authenticate, async (req, res) => {
  const { userId } = req.query;
  const isAdmin = req.user.role === 'admin';
  let rows;
  const fields = `
    id, user_id, created_at, building, floor, room, category, element,
    condition_rating, priority_rating, damage_category, root_cause, root_cause_details,
    notes, latitude, longitude, photo_uri, (photo_blob IS NOT NULL) AS has_photo
  `;
  if (isAdmin && userId) {
    [rows] = await pool.query(`SELECT ${fields} FROM assessments WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  } else if (isAdmin && !userId) {
    [rows] = await pool.query(`SELECT ${fields} FROM assessments ORDER BY created_at DESC`);
  } else {
    [rows] = await pool.query(`SELECT ${fields} FROM assessments WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
  }
  return res.json({ assessments: rows.map(mapAssessment) });
});

app.get('/assessments/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    'SELECT id, user_id, created_at, building, floor, room, category, element, condition_rating, priority_rating, damage_category, root_cause, root_cause_details, notes, latitude, longitude, photo_uri, (photo_blob IS NOT NULL) AS has_photo FROM assessments WHERE id = ?',
    [id]
  );
  const item = rows[0];
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json({ assessment: mapAssessment(item) });
});

app.get('/assessments/:id/photo', async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT user_id, photo_blob, photo_mime FROM assessments WHERE id = ?', [id]);
  const item = rows[0];
  if (!item || !item.photo_blob) return res.status(404).end();
  res.setHeader('Content-Type', item.photo_mime || 'image/jpeg');
  return res.end(item.photo_blob);
});

app.post('/assessments', authenticate, assessmentUpload.single('photo'), async (req, res) => {
  try {
    const {
      created_at,
      building,
      floor,
      room,
      category,
      element,
      condition,
      priority,
      damageCategory,
      rootCause,
      rootCauseDetails,
      notes,
      photo_uri,
      latitude,
      longitude,
    } = req.body || {};
    if (!category || !element || !condition || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const photoBlob = req.file ? req.file.buffer : null;
    const photoMime = req.file ? req.file.mimetype : null;
    const photoPath = req.file ? '' : (photo_uri || '');
    await pool.query(
      `INSERT INTO assessments
       (id, user_id, created_at, building, floor, room, category, element, condition_rating, priority_rating,
        damage_category, root_cause, root_cause_details, notes, latitude, longitude, photo_uri, photo_blob, photo_mime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        Number(created_at) || Date.now(),
        building || '',
        floor || '',
        room || '',
        category,
        element,
        Number(condition),
        Number(priority),
        damageCategory || '',
        rootCause || '',
        rootCauseDetails || '',
        notes || '',
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        photoPath ? (photoPath.startsWith('http') ? photoPath : `${BASE_URL}${photoPath}`) : '',
        photoBlob,
        photoMime,
      ]
    );
    const [rows] = await pool.query(
      'SELECT id, user_id, created_at, building, floor, room, category, element, condition_rating, priority_rating, damage_category, root_cause, root_cause_details, notes, latitude, longitude, photo_uri, (photo_blob IS NOT NULL) AS has_photo FROM assessments WHERE id = ?',
      [id]
    );
    return res.json({ assessment: mapAssessment(rows[0]) });
  } catch (err) {
    console.error('Create assessment error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/assessments/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM assessments WHERE id = ?', [id]);
  const item = rows[0];
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const fields = ['notes'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (!updates.length) return res.json({ assessment: item });
  await pool.query(`UPDATE assessments SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  const [nextRows] = await pool.query('SELECT * FROM assessments WHERE id = ?', [id]);
  return res.json({ assessment: nextRows[0] });
});

app.delete('/assessments/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM assessments WHERE id = ?', [id]);
  const item = rows[0];
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && item.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await pool.query('DELETE FROM assessments WHERE id = ?', [id]);
  return res.json({ ok: true });
});

app.get('/metrics', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userId = req.query.userId || req.user.id;
  if (!isAdmin && userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const [assessments] = await pool.query('SELECT id FROM assessments WHERE user_id = ?', [userId]);
  const [imageRows] = await pool.query(
    'SELECT COUNT(*) as count FROM assessments WHERE user_id = ? AND (photo_blob IS NOT NULL OR photo_uri <> \'\')',
    [userId]
  );
  const assessmentCount = assessments.length;
  const imageCount = Number(imageRows?.[0]?.count || 0);
  const [blobRows] = await pool.query('SELECT SUM(OCTET_LENGTH(photo_blob)) as bytes FROM assessments WHERE user_id = ?', [userId]);
  const storageBytes = Number(blobRows?.[0]?.bytes || 0);

  return res.json({
    assessmentCount,
    imageCount,
    storageBytes,
    lastCalculated: Date.now(),
  });
});

app.get('/metrics/system', authenticate, requireAdmin, async (req, res) => {
  const [assessments] = await pool.query('SELECT id FROM assessments');
  const [imageRows] = await pool.query(
    'SELECT COUNT(*) as count FROM assessments WHERE photo_blob IS NOT NULL OR photo_uri <> \'\''
  );
  const assessmentCount = assessments.length;
  const imageCount = Number(imageRows?.[0]?.count || 0);
  const [blobRows] = await pool.query('SELECT SUM(OCTET_LENGTH(photo_blob)) as bytes FROM assessments');
  const storageBytes = Number(blobRows?.[0]?.bytes || 0);

  return res.json({
    assessmentCount,
    imageCount,
    storageBytes,
    lastCalculated: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`API server running at ${BASE_URL}`);
});
