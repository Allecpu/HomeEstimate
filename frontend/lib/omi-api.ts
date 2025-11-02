/**
 * Client per le API OMI (Osservatorio del Mercato Immobiliare)
 */

import {
  getLatestOMISnapshotByCity,
  getOMISnapshot,
  saveOMISnapshot,
  OMI_SNAPSHOT_DEFAULT_TTL_MS,
  OMI_SNAPSHOT_WILDCARD,
  OMI_SNAPSHOT_ZONE_KEY,
  type OMISnapshotRow,
} from '@/lib/db';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type OMIQuerySnapshotPayload = {
  kind: 'query';
  response: OMIResponse;
  params: {
    city: string;
    zona_omi?: string | null;
    tipo_immobile?: string | null;
    operazione?: 'acquisto' | 'affitto';
    metri_quadri?: number;
  };
};

export type OMIZoneListSnapshotPayload = {
  kind: 'zone-list';
  city: string;
  zones: string[];
  source?: 'query' | 'manual';
};

function buildQuerySnapshotKey(params: {
  city: string;
  zona_omi?: string;
  tipo_immobile?: string;
}): {
  comune: string;
  zona: string;
  destinazione: string;
} {
  return {
    comune: params.city,
    zona: params.zona_omi ?? OMI_SNAPSHOT_WILDCARD,
    destinazione: params.tipo_immobile ?? OMI_SNAPSHOT_WILDCARD,
  };
}

function extractZonesFromResponse(response: OMIResponse): string[] {
  const zones = new Set<string>();
  response.quotations.forEach((quotation) => {
    if (quotation.zona_omi) {
      zones.add(quotation.zona_omi);
    }
  });
  return Array.from(zones).sort();
}

async function persistZoneSnapshot(city: string, zones: string[], options?: { ttlMs?: number; semestre?: string }) {
  if (!zones.length) {
    return;
  }

  await saveOMISnapshot<OMIZoneListSnapshotPayload>({
    key: {
      comune: city,
      zona: OMI_SNAPSHOT_ZONE_KEY,
      destinazione: OMI_SNAPSHOT_ZONE_KEY,
    },
    payload: {
      kind: 'zone-list',
      city,
      zones,
      source: 'query',
    },
    ttlMs: options?.ttlMs ?? OMI_SNAPSHOT_DEFAULT_TTL_MS,
    semestre: options?.semestre,
  });
}

async function getCachedZonesFromCity(city: string): Promise<string[] | null> {
  const directSnapshot = await getOMISnapshot<OMIZoneListSnapshotPayload>({
    comune: city,
    zona: OMI_SNAPSHOT_ZONE_KEY,
    destinazione: OMI_SNAPSHOT_ZONE_KEY,
  });

  if (directSnapshot?.payload.payload.kind === 'zone-list') {
    return directSnapshot.payload.payload.zones;
  }

  const latestQuery = await getLatestOMISnapshotByCity<OMIQuerySnapshotPayload>(city, (row: OMISnapshotRow) =>
    row.zona !== OMI_SNAPSHOT_ZONE_KEY
  );

  if (latestQuery?.payload.payload.kind === 'query') {
    const zones = extractZonesFromResponse(latestQuery.payload.payload.response);
    const ttl = Math.max(latestQuery.row.expiresAt - Date.now(), 0);
    if (zones.length && ttl > 0) {
      await persistZoneSnapshot(city, zones, { ttlMs: ttl, semestre: latestQuery.row.semestre });
    }
    return zones.length ? zones : null;
  }

  return null;
}

export interface OMIQuotation {
  zona_omi: string;
  property_type: string;
  stato_conservazione?: string;
  prezzo_acquisto_min?: number;
  prezzo_acquisto_max?: number;
  prezzo_acquisto_medio?: number;
  prezzo_affitto_min?: number;
  prezzo_affitto_max?: number;
  prezzo_affitto_medio?: number;
}

export interface OMIResponse {
  codice_comune: string;
  comune: string;
  metri_quadri: number;
  zona_omi_filter?: string;
  quotations: OMIQuotation[];
  timestamp: string;
  zone_count: number;
}

export interface PropertyTypeInfo {
  value: string;
  display_name: string;
}

export interface CadastralCodeInfo {
  city: string;
  code: string;
}

export interface PriceData {
  min: number;
  max: number;
  medio: number;
  min_mq: number;
  max_mq: number;
  medio_mq: number;
}

/**
 * Interroga le API OMI per ottenere quotazioni immobiliari
 */
export async function queryOMI(params: {
  city: string;
  metri_quadri?: number;
  operazione?: 'acquisto' | 'affitto';
  zona_omi?: string;
  tipo_immobile?: string;
}): Promise<OMIResponse> {
  const key = buildQuerySnapshotKey(params);
  const cachedSnapshot = await getOMISnapshot<OMIQuerySnapshotPayload>({
    comune: key.comune,
    zona: key.zona,
    destinazione: key.destinazione,
  });

  if (cachedSnapshot?.payload.payload.kind === 'query') {
    return cachedSnapshot.payload.payload.response;
  }

  const response = await fetch(`${API_BASE_URL}/api/omi/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Errore nel recupero dati OMI');
  }

  const data: OMIResponse = await response.json();

  await saveOMISnapshot<OMIQuerySnapshotPayload>({
    key,
    payload: {
      kind: 'query',
      response: data,
      params: {
        city: params.city,
        zona_omi: params.zona_omi ?? null,
        tipo_immobile: params.tipo_immobile ?? null,
        operazione: params.operazione,
        metri_quadri: params.metri_quadri,
      },
    },
    ttlMs: OMI_SNAPSHOT_DEFAULT_TTL_MS,
    semestre: data.timestamp,
  });

  await persistZoneSnapshot(params.city, extractZonesFromResponse(data), {
    ttlMs: OMI_SNAPSHOT_DEFAULT_TTL_MS,
    semestre: data.timestamp,
  });

  return data;
}

/**
 * Ottiene i prezzi di acquisto per un immobile
 */
export async function getPurchasePrice(params: {
  city: string;
  metri_quadri: number;
  tipo_immobile?: string;
  zona_omi?: string;
  signal?: AbortSignal;
}): Promise<PriceData> {
  const { city, metri_quadri, tipo_immobile, zona_omi, signal } = params;
  const searchParams = new URLSearchParams({
    city,
    metri_quadri: metri_quadri.toString(),
  });

  if (tipo_immobile) {
    searchParams.append('tipo_immobile', tipo_immobile);
  }
  if (zona_omi) {
    searchParams.append('zona_omi', zona_omi);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/omi/purchase-price?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Errore nel recupero prezzi acquisto');
  }

  return response.json();
}

/**
 * Ottiene i prezzi di affitto per un immobile
 */
export async function getRentalPrice(params: {
  city: string;
  metri_quadri: number;
  tipo_immobile?: string;
  zona_omi?: string;
  signal?: AbortSignal;
}): Promise<PriceData> {
  const { city, metri_quadri, tipo_immobile, zona_omi, signal } = params;
  const searchParams = new URLSearchParams({
    city,
    metri_quadri: metri_quadri.toString(),
  });

  if (tipo_immobile) {
    searchParams.append('tipo_immobile', tipo_immobile);
  }
  if (zona_omi) {
    searchParams.append('zona_omi', zona_omi);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/omi/rental-price?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Errore nel recupero prezzi affitto');
  }

  return response.json();
}

/**
 * Ottiene la lista di tutti i tipi di immobile supportati
 */
export async function getPropertyTypes(): Promise<PropertyTypeInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/omi/property-types`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel recupero tipi immobile');
  }

  return response.json();
}

/**
 * Ottiene il codice catastale di un comune
 */
export async function getCadastralCode(city: string): Promise<CadastralCodeInfo> {
  const response = await fetch(
    `${API_BASE_URL}/api/omi/cadastral-code?city=${encodeURIComponent(city)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Codice catastale non trovato');
  }

  return response.json();
}

/**
 * Ottiene la lista di tutti i comuni supportati
 */
export async function getSupportedCities(): Promise<CadastralCodeInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/omi/cities`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Errore nel recupero comuni supportati');
  }

  return response.json();
}

/**
 * Verifica se un comune è supportato dalle API OMI
 */
export async function isCitySupported(city: string): Promise<boolean> {
  try {
    await getCadastralCode(city);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ottiene le zone OMI disponibili per un comune
 */
export async function getOMIZones(city: string): Promise<string[]> {
  const normalizedCity = city?.trim();
  if (!normalizedCity) {
    return [];
  }

  try {
    const cached = await getCachedZonesFromCity(normalizedCity);
    if (cached && cached.length > 0) {
      return cached;
    }

    const response = await queryOMI({
      city: normalizedCity,
      metri_quadri: 1,
    });

    const zones = extractZonesFromResponse(response);
    if (zones.length) {
      await persistZoneSnapshot(normalizedCity, zones, {
        ttlMs: OMI_SNAPSHOT_DEFAULT_TTL_MS,
        semestre: response.timestamp,
      });
    }

    return zones;
  } catch (error) {
    console.error('Failed to load OMI zones:', error);
    return [];
  }
}

export async function getCachedOMIZones(city: string): Promise<string[] | null> {
  const normalizedCity = city?.trim();
  if (!normalizedCity) {
    return null;
  }

  try {
    return await getCachedZonesFromCity(normalizedCity);
  } catch (error) {
    console.warn('Unable to read cached OMI zones:', error);
    return null;
  }
}

export interface OMISuggestion {
  suggested_property_type: string | null;
  suggested_zone: string | null;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Ottiene suggerimenti automatici per tipo immobile e zona OMI in base all'indirizzo
 */
export async function getOMISuggestions(params: {
  address: string;
  city: string;
  property_description?: string;
}): Promise<OMISuggestion> {
  const searchParams = new URLSearchParams({
    address: params.address,
    city: params.city,
  });

  if (params.property_description) {
    searchParams.append('property_description', params.property_description);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/omi/suggest?${searchParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('Impossibile ottenere suggerimenti OMI');
      return {
        suggested_property_type: null,
        suggested_zone: null,
        confidence: 'low',
      };
    }

    return response.json();
  } catch (error) {
    console.error('Errore nel recupero suggerimenti OMI:', error);
    return {
      suggested_property_type: null,
      suggested_zone: null,
      confidence: 'low',
    };
  }
}
