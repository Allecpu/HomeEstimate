/**
 * Client per le API OMI (Osservatorio del Mercato Immobiliare)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  return response.json();
}

/**
 * Ottiene i prezzi di acquisto per un immobile
 */
export async function getPurchasePrice(params: {
  city: string;
  metri_quadri: number;
  tipo_immobile?: string;
  zona_omi?: string;
}): Promise<PriceData> {
  const searchParams = new URLSearchParams({
    city: params.city,
    metri_quadri: params.metri_quadri.toString(),
  });

  if (params.tipo_immobile) {
    searchParams.append('tipo_immobile', params.tipo_immobile);
  }
  if (params.zona_omi) {
    searchParams.append('zona_omi', params.zona_omi);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/omi/purchase-price?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
}): Promise<PriceData> {
  const searchParams = new URLSearchParams({
    city: params.city,
    metri_quadri: params.metri_quadri.toString(),
  });

  if (params.tipo_immobile) {
    searchParams.append('tipo_immobile', params.tipo_immobile);
  }
  if (params.zona_omi) {
    searchParams.append('zona_omi', params.zona_omi);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/omi/rental-price?${searchParams}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
  try {
    const response = await queryOMI({
      city,
      metri_quadri: 1,
    });

    // Estrai le zone uniche dalle quotazioni
    const zones = new Set<string>();
    response.quotations.forEach((q) => zones.add(q.zona_omi));
    return Array.from(zones).sort();
  } catch {
    return [];
  }
}
