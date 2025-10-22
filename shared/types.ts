// Tipi condivisi tra frontend e backend

export type EvalStatus = 'draft' | 'parsing' | 'validating' | 'calculating' | 'ready' | 'error';
export type DataSource = 'auto' | 'manual' | 'hybrid';
export type PropertyType = 'residenziale' | 'signorile' | 'economico' | 'ufficio' | 'negozio';
export type PropertyState = 'ottimo' | 'buono' | 'discreto' | 'da_ristrutturare';
export type EnergyClass = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NC';

export interface Property {
  // Dati principali
  url: string;
  title?: string;
  description?: string;
  price?: number;

  // Localizzazione
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  omiZone?: string;

  // Caratteristiche
  surface: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  totalFloors?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  hasCellar?: boolean;

  // Stato e tipologia
  propertyType?: PropertyType;
  state?: PropertyState;
  yearBuilt?: number;
  energyClass?: EnergyClass;

  // Metadata
  photos?: string[];
  source?: 'idealista' | 'immobiliare' | 'casa';
}

export interface PropertyValidation extends Property {
  missingFields: string[];
  validationErrors: Record<string, string>;
}

export interface OMIData {
  comune: string;
  zona: string;
  destinazione: string;
  stato: string;
  valoreMin: number;
  valoreMax: number;
  valoreNormale: number;
  semestre: string;
  fonte: string;
}

export interface Comparable {
  id: string;
  property: Property;
  distance: number; // metri
  priceM2: number;
  similarityScore: number; // 0-100
  includedInEstimate: boolean;
  excludeReason?: 'outlier' | 'non_comparabile' | 'altro';
  matchedCriteria: {
    location: number;
    surface: number;
    rooms: number;
    floor: number;
    state: number;
  };
}

export interface ValuationResult {
  id: string;
  property: Property;
  status: EvalStatus;

  // Stima
  estimatedValue: number;
  estimatedValueMin: number;
  estimatedValueMax: number;
  priceM2: number;

  // Dati utilizzati
  omiData?: OMIData;
  comparables: Comparable[];

  // Metriche di qualità
  confidenceScore: number; // 0-100
  qualityScore: number; // 0-100
  dataQuality: {
    completeness: number; // 0-100
    reliability: number; // 0-100
  };

  // Analisi
  deviation: number; // % scostamento da prezzo richiesto
  marketPosition: 'sotto_mercato' | 'in_linea' | 'sopra_mercato';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface WizardStep {
  step: number;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    step: 1,
    title: 'URL Annuncio',
    description: 'Incolla il link e visualizza i dati estratti',
    isComplete: false,
    isActive: true,
  },
  {
    step: 2,
    title: 'Completa Dati',
    description: 'Integra le informazioni mancanti',
    isComplete: false,
    isActive: false,
  },
  {
    step: 3,
    title: 'Verifica Posizione',
    description: 'Conferma la geolocalizzazione sulla mappa',
    isComplete: false,
    isActive: false,
  },
  {
    step: 4,
    title: 'Calcolo',
    description: 'Elaborazione della stima in corso',
    isComplete: false,
    isActive: false,
  },
  {
    step: 5,
    title: 'Report',
    description: 'Visualizza i risultati della valutazione',
    isComplete: false,
    isActive: false,
  },
];
