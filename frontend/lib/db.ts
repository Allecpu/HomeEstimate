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
  }
}

// Esporta istanza singleton
export const db = new HomeEstimateDB();

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
}
