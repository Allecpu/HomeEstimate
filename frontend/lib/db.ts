import Dexie, { Table } from 'dexie';

// Types per IndexedDB
export type EvalStatus = 'draft' | 'parsing' | 'validating' | 'calculating' | 'ready' | 'error';
export type DataSource = 'auto' | 'manual' | 'hybrid';

export interface EvaluationRow {
  id?: number;
  createdAt: number; // epoch ms
  updatedAt: number;
  addressHash: string; // SHA-256 dell'indirizzo normalizzato
  city: string;
  rawUrl: string;
  encryptedPayload: ArrayBuffer; // JSON cifrato (AES-GCM)
  omiZone?: string;
  status: EvalStatus;
  qualityScore?: number; // 0..100
  dataQuality?: number; // 0..100
  dataSource?: DataSource;
  missingFields?: string; // JSON array
}

export interface ComparableRow {
  id?: number;
  evalId: number;
  createdAt: number;
  distance: number;
  priceM2: number;
  similarityScore: number;
  includedInEstimate: boolean;
  excludeReason?: 'outlier' | 'non_comparabile' | 'altro';
  encryptedPayload: ArrayBuffer; // Dati completi cifrati
}

export interface OMISnapshotRow {
  id?: number;
  comune: string;
  zona: string;
  destinazione: string;
  semestre: string;
  createdAt: number;
  expiresAt: number;
  source: string;
  encryptedPayload: ArrayBuffer; // Valori OMI cifrati
}

export interface FailedJobRow {
  id?: number;
  jobType: string;
  url: string;
  attemptCount: number;
  lastAttempt: number;
  retryAfter: number;
  errorMessage?: string;
  payload?: string; // JSON
}

export interface FeedbackRow {
  id?: number;
  evalId: number;
  ts: number;
  userRating: number; // 1-5 stelle
  actualPrice?: number;
  comments?: string;
}

export interface SettingsRow {
  key: string;
  value: string; // JSON
}

export interface LogRow {
  id?: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  ts: number;
  message: string;
  context?: string; // JSON
}

// Database Dexie
export class HomeEstimateDB extends Dexie {
  evaluations!: Table<EvaluationRow, number>;
  comparables!: Table<ComparableRow, number>;
  omiSnapshots!: Table<OMISnapshotRow, number>;
  failedJobs!: Table<FailedJobRow, number>;
  feedbacks!: Table<FeedbackRow, number>;
  settings!: Table<SettingsRow, string>;
  logs!: Table<LogRow, number>;

  constructor() {
    super('HomeEstimateDB');

    // Schema versioning
    this.version(1).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, status',
      comparables: '++id, evalId, createdAt, distance, priceM2, similarityScore, includedInEstimate',
      omiSnapshots: '++id, comune, zona, destinazione, semestre, createdAt, expiresAt, source',
      failedJobs: '++id, jobType, url, attemptCount, lastAttempt, retryAfter',
      feedbacks: '++id, evalId, ts, userRating',
      settings: 'key',
      logs: '++id, level, ts'
    });

    // v2: Aggiungi indici per omiZone e qualityScore
    this.version(2).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, omiZone, status, qualityScore',
    });

    // v3: Aggiungi campi per data quality
    this.version(3).stores({
      evaluations: '++id, createdAt, updatedAt, addressHash, city, omiZone, status, qualityScore, dataQuality, dataSource',
    });

    // v4: Indice composito per cache OMI
    this.version(4).stores({
      omiSnapshots:
        '++id, [comune+zona+destinazione], comune, zona, destinazione, semestre, createdAt, expiresAt, source',
    });
  }
}

// Esporta istanza singleton
export const db = new HomeEstimateDB();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const OMI_SNAPSHOT_DEFAULT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 mesi
export const OMI_SNAPSHOT_WILDCARD = '*';
export const OMI_SNAPSHOT_ZONE_KEY = '__zone_list__';

interface SerializedSnapshotPayload<T> {
  version: 1;
  fetchedAt: number;
  payload: T;
  metadata?: Record<string, unknown> | null;
}

export interface OMISnapshotKey {
  comune: string;
  zona?: string | null;
  destinazione?: string | null;
}

export interface OMISnapshotResult<TPayload> {
  row: OMISnapshotRow;
  payload: SerializedSnapshotPayload<TPayload>;
}

function normalizeSnapshotKeyPart(value: string | null | undefined): string {
  if (!value) {
    return OMI_SNAPSHOT_WILDCARD;
  }

  return value.trim().toLowerCase() || OMI_SNAPSHOT_WILDCARD;
}

function serializeSnapshotPayload(payload: SerializedSnapshotPayload<unknown>): ArrayBuffer {
  const encoded = textEncoder.encode(JSON.stringify(payload));
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

function deserializeSnapshotPayload<T>(buffer: ArrayBuffer): SerializedSnapshotPayload<T> {
  const json = textDecoder.decode(new Uint8Array(buffer));
  const parsed = JSON.parse(json) as SerializedSnapshotPayload<T>;

  if (!parsed || parsed.version !== 1 || typeof parsed.fetchedAt !== 'number') {
    throw new Error('Invalid snapshot payload structure');
  }

  return parsed;
}

export async function getOMISnapshot<TPayload = unknown>(
  key: OMISnapshotKey
): Promise<OMISnapshotResult<TPayload> | null> {
  const comune = normalizeSnapshotKeyPart(key.comune);
  const zona = normalizeSnapshotKeyPart(key.zona ?? null);
  const destinazione = normalizeSnapshotKeyPart(key.destinazione ?? null);

  try {
    const snapshot = await db.omiSnapshots
      .where('[comune+zona+destinazione]')
      .equals([comune, zona, destinazione])
      .first();

    if (!snapshot) {
      return null;
    }

    if (snapshot.expiresAt <= Date.now()) {
      if (snapshot.id) {
        await db.omiSnapshots.delete(snapshot.id);
      }
      return null;
    }

    const payload = deserializeSnapshotPayload<TPayload>(snapshot.encryptedPayload);
    return { row: snapshot, payload };
  } catch (error) {
    console.warn('Failed to load OMI snapshot, removing entry', error);
    const staleSnapshot = await db.omiSnapshots
      .where('[comune+zona+destinazione]')
      .equals([comune, zona, destinazione])
      .first();

    if (staleSnapshot?.id) {
      await db.omiSnapshots.delete(staleSnapshot.id);
    }

    return null;
  }
}

export async function saveOMISnapshot<TPayload>(params: {
  key: OMISnapshotKey;
  payload: SerializedSnapshotPayload<TPayload>['payload'];
  metadata?: SerializedSnapshotPayload<TPayload>['metadata'];
  semestre?: string;
  source?: string;
  ttlMs?: number;
}) {
  const comune = normalizeSnapshotKeyPart(params.key.comune);
  const zona = normalizeSnapshotKeyPart(params.key.zona ?? null);
  const destinazione = normalizeSnapshotKeyPart(params.key.destinazione ?? null);
  const now = Date.now();
  const expiresAt = now + (params.ttlMs ?? OMI_SNAPSHOT_DEFAULT_TTL_MS);
  const payload: SerializedSnapshotPayload<TPayload> = {
    version: 1,
    fetchedAt: now,
    payload: params.payload,
    metadata: params.metadata ?? null,
  };

  const buffer = serializeSnapshotPayload(payload);

  await db.transaction('rw', db.omiSnapshots, async () => {
    const existing = await db.omiSnapshots
      .where('[comune+zona+destinazione]')
      .equals([comune, zona, destinazione])
      .first();

    const row: Partial<OMISnapshotRow> = {
      comune,
      zona,
      destinazione,
      semestre: params.semestre ?? existing?.semestre ?? 'n/a',
      source: params.source ?? existing?.source ?? 'omi-api',
      createdAt: now,
      expiresAt,
      encryptedPayload: buffer,
    };

    if (existing?.id) {
      await db.omiSnapshots.update(existing.id, row);
    } else {
      await db.omiSnapshots.add(row as OMISnapshotRow);
    }
  });
}

export async function getLatestOMISnapshotByCity<TPayload = unknown>(
  comune: string,
  filter?: (row: OMISnapshotRow) => boolean
): Promise<OMISnapshotResult<TPayload> | null> {
  const normalizedComune = normalizeSnapshotKeyPart(comune);
  const now = Date.now();

  const entries = await db.omiSnapshots
    .where('comune')
    .equals(normalizedComune)
    .and((row) => row.expiresAt > now)
    .sortBy('createdAt');

  while (entries.length > 0) {
    const candidate = entries.pop();
    if (!candidate) {
      break;
    }

    if (filter && !filter(candidate)) {
      continue;
    }

    try {
      const payload = deserializeSnapshotPayload<TPayload>(candidate.encryptedPayload);
      return { row: candidate, payload };
    } catch (error) {
      console.warn('Failed to parse latest OMI snapshot, deleting entry', error);
      if (candidate.id) {
        await db.omiSnapshots.delete(candidate.id);
      }
    }
  }

  return null;
}

// Helper per gestire quota exceeded
export async function handleQuotaExceeded() {
  console.warn('IndexedDB quota exceeded, cleaning up old data...');

  // Elimina valutazioni vecchie (> 6 mesi)
  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
  await db.evaluations.where('createdAt').below(sixMonthsAgo).delete();

  // Elimina comparabili orfani
  const evalIds = await db.evaluations.toCollection().primaryKeys();
  await db.comparables.where('evalId').noneOf(evalIds as number[]).delete();

  // Elimina snapshot OMI scaduti
  await db.omiSnapshots.where('expiresAt').below(Date.now()).delete();

  // Elimina log vecchi (> 1 mese)
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.logs.where('ts').below(oneMonthAgo).delete();
}

// Helper per cleanup automatico
export async function autoCleanup() {
  try {
    // Elimina snapshot OMI scaduti
    await db.omiSnapshots.where('expiresAt').below(Date.now()).delete();

    // Elimina failed jobs completati o troppo vecchi
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await db.failedJobs.where('lastAttempt').below(oneWeekAgo).delete();

    console.log('Auto cleanup completed');
  } catch (error) {
    console.error('Auto cleanup failed:', error);
  }
}

// Esegui cleanup al caricamento
if (typeof window !== 'undefined') {
  autoCleanup();

  if (!window.__homeEstimateCleanupInterval) {
    window.__homeEstimateCleanupInterval = window.setInterval(() => {
      autoCleanup().catch((error) => console.error('Scheduled cleanup failed:', error));
    }, 6 * 60 * 60 * 1000); // ogni 6 ore
  }
}

declare global {
  interface Window {
    __homeEstimateCleanupInterval?: number;
  }
}
