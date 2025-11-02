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
