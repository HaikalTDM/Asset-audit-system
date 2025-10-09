// Web fallback for data persistence without SQLite/FS
// Stores data in localStorage so the app can run on web without wasm/worker.

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

export type AssessmentDetails = Row & { notes: string };

const STORAGE_KEY = 'asset-audit-web-db-v1';

type Stored = {
  assessments: Array<{
    id: string;
    created_at: number;
    latitude: number | null;
    longitude: number | null;
  }>;
  defects: Array<{
    id: string;
    assessment_id: string;
    category: string;
    element: string;
    condition: number;
    priority: number;
    notes: string;
    photo_uri: string;
  }>;
};

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { assessments: [], defects: [] };
}

function save(state: Stored) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

async function nextStandardId(current: Stored) {
  const now = new Date();
  const prefix = `${pad2(now.getDate())}${pad2(now.getMonth() + 1)}${now.getFullYear()}-`;
  const todays = current.assessments
    .map(a => a.id)
    .filter(id => id.startsWith(prefix))
    .sort()
    .reverse();
  let seq = 1;
  if (todays.length) {
    const tail = todays[0].split('-')[1] ?? '00';
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${pad2(seq)}`;
}

export async function migrate() {}

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
  const db = load();
  const id = await nextStandardId(db);

  db.assessments.push({
    id,
    created_at: Date.now(),
    latitude: p.lat ? Number(p.lat) : null,
    longitude: p.lon ? Number(p.lon) : null,
  });
  db.defects.push({
    id: `${id}-d1`,
    assessment_id: id,
    category: p.category,
    element: p.element,
    condition: p.condition,
    priority: p.priority,
    notes: p.notes ?? '',
    photo_uri: p.photoUri,
  });
  save(db);
  return id;
}

export async function listAssessments(): Promise<Row[]> {
  const db = load();
  const rows: Row[] = db.assessments
    .map(a => {
      const d = db.defects.find(x => x.assessment_id === a.id);
      if (!d) return null;
      return {
        id: a.id,
        created_at: a.created_at,
        latitude: a.latitude,
        longitude: a.longitude,
        category: d.category,
        element: d.element,
        condition: d.condition,
        priority: d.priority,
        photo_uri: d.photo_uri,
      } as Row;
    })
    .filter(Boolean) as Row[];
  return rows.sort((a,b) => b.created_at - a.created_at);
}

export async function deleteAssessment(id: string) {
  const db = load();
  db.assessments = db.assessments.filter(a => a.id !== id);
  db.defects = db.defects.filter(d => d.assessment_id !== id);
  save(db);
}

export async function getAssessmentDetails(id: string): Promise<AssessmentDetails | null> {
  const db = load();
  const a = db.assessments.find(x => x.id === id);
  const d = db.defects.find(x => x.assessment_id === id);
  if (!a || !d) return null;
  return {
    id: a.id,
    created_at: a.created_at,
    latitude: a.latitude,
    longitude: a.longitude,
    category: d.category,
    element: d.element,
    condition: d.condition,
    priority: d.priority,
    photo_uri: d.photo_uri,
    notes: d.notes,
  };
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
  const db = load();
  const ai = db.assessments.findIndex(a => a.id === p.id);
  if (ai >= 0) db.assessments[ai] = { id: p.id, created_at: p.created_at, latitude: p.latitude, longitude: p.longitude };
  else db.assessments.push({ id: p.id, created_at: p.created_at, latitude: p.latitude, longitude: p.longitude });
  const di = db.defects.findIndex(d => d.assessment_id === p.id);
  const record = { id: `${p.id}-d1`, assessment_id: p.id, category: p.category, element: p.element, condition: p.condition, priority: p.priority, notes: p.notes, photo_uri: p.photo_uri };
  if (di >= 0) db.defects[di] = record; else db.defects.push(record);
  save(db);
}

