// lib/db.ts
import * as FileSystem from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

type Row = {
  id: string;
  created_at: number;
  latitude: number | null;
  longitude: number | null;
  category: string;
  element: string;
  condition: number;
  priority: number;
  photo_uri: string;
};

let dbPromise: Promise<SQLiteDatabase> | null = null;
async function getDb() {
  if (!dbPromise) dbPromise = openDatabaseAsync('asset_audit.db');
  return dbPromise;
}

export async function migrate() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      assessor TEXT
    );

    CREATE TABLE IF NOT EXISTS defects (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      category TEXT,
      element TEXT,
      condition INTEGER,
      priority INTEGER,
      notes TEXT,
      photo_uri TEXT,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );
  `);
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

async function nextStandardId() {
  const now = new Date();
  const prefix = `${pad2(now.getDate())}${pad2(now.getMonth() + 1)}${now.getFullYear()}-`;
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM assessments WHERE id LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );
  let seq = 1;
  if (row?.id) {
    const tail = row.id.split('-')[1] ?? '00';
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${pad2(seq)}`;
}

export async function saveAssessmentWithDefect(p: {
  photoUri: string;
  lat?: string;
  lon?: string;
  category: string;
  element: string;
  condition: number;
  priority: number;
  notes?: string;
}) {
  const db = await getDb();
  const id = await nextStandardId();

  // Persist photo in app storage (or cache as fallback)
  const DOC_DIR = (FileSystem as any).documentDirectory as string | null | undefined;
  const CACHE_DIR = (FileSystem as any).cacheDirectory as string | null | undefined;
  const base = DOC_DIR ?? CACHE_DIR ?? null;
  let dest = p.photoUri;
  if (base) {
    const photosDir = base + 'photos/';
    await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true }).catch(() => {});
    dest = photosDir + `${id}.jpg`;
    try { await FileSystem.copyAsync({ from: p.photoUri, to: dest }); } catch { dest = p.photoUri; }
  }

  await db.runAsync(
    'INSERT INTO assessments (id, created_at, latitude, longitude) VALUES (?,?,?,?)',
    [id, Date.now(), p.lat ? Number(p.lat) : null, p.lon ? Number(p.lon) : null]
  );

  await db.runAsync(
    `INSERT INTO defects
      (id, assessment_id, category, element, condition, priority, notes, photo_uri)
     VALUES (?,?,?,?,?,?,?,?)`,
    [`${id}-d1`, id, p.category, p.element, p.condition, p.priority, p.notes ?? '', dest]
  );

  return id;
}

export async function listAssessments(): Promise<Row[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(`
    SELECT a.id, a.created_at, a.latitude, a.longitude,
           d.category, d.element, d.condition, d.priority, d.photo_uri
    FROM assessments a
    JOIN defects d ON d.assessment_id = a.id
    ORDER BY a.created_at DESC
  `);
  return rows;
}

export async function deleteAssessment(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM assessments WHERE id = ?', [id]);
}

export async function clearAllData() {
  const db = await getDb();
  await db.execAsync('DELETE FROM defects; DELETE FROM assessments;');
  // Remove all photos
  const DOC_DIR = (FileSystem as any).documentDirectory as string | null | undefined;
  const CACHE_DIR = (FileSystem as any).cacheDirectory as string | null | undefined;
  const base = DOC_DIR ?? CACHE_DIR ?? null;
  if (!base) return;
  const dir = base + 'photos/';
  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(entries.map((name) => FileSystem.deleteAsync(dir + name, { idempotent: true })));
  } catch {}
}

export type AssessmentDetails = Row & { notes: string };

export async function getAssessmentDetails(id: string): Promise<AssessmentDetails | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AssessmentDetails>(`
    SELECT a.id, a.created_at, a.latitude, a.longitude,
           d.category, d.element, d.condition, d.priority, d.photo_uri, d.notes
    FROM assessments a
    JOIN defects d ON d.assessment_id = a.id
    WHERE a.id = ?
    LIMIT 1
  `, [id]);
  return row ?? null;
}

export async function upsertAssessmentWithDefectFromImport(p: {
  id: string;
  created_at: number;
  latitude: number | null;
  longitude: number | null;
  category: string;
  element: string;
  condition: number;
  priority: number;
  notes: string;
  photo_uri: string;
}) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO assessments (id, created_at, latitude, longitude) VALUES (?,?,?,?)',
    [p.id, p.created_at, p.latitude, p.longitude]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO defects (id, assessment_id, category, element, condition, priority, notes, photo_uri)
     VALUES (?,?,?,?,?,?,?,?)`,
    [`${p.id}-d1`, p.id, p.category, p.element, p.condition, p.priority, p.notes, p.photo_uri]
  );
}
