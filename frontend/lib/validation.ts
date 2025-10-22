import { z } from 'zod';

// Schema Step 1: URL
export const urlSchema = z.object({
  url: z.string()
    .url('Inserisci un URL valido')
    .refine(
      (url) => {
        const validDomains = ['idealista.it', 'immobiliare.it', 'casa.it'];
        return validDomains.some(domain => url.includes(domain));
      },
      'URL deve essere di Idealista, Immobiliare.it o Casa.it'
    ),
});

export type UrlFormData = z.infer<typeof urlSchema>;

// Schema Step 2: Dati proprietà completi
export const propertySchema = z.object({
  // Localizzazione
  address: z.string().min(5, 'Inserisci un indirizzo valido'),
  city: z.string().min(2, 'Inserisci una città valida'),
  province: z.string().length(2, 'Provincia deve essere 2 caratteri').optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'CAP deve essere 5 cifre').optional(),

  // Caratteristiche obbligatorie
  surface: z.number()
    .min(10, 'Superficie minima 10 mq')
    .max(10000, 'Superficie massima 10.000 mq'),

  price: z.number()
    .min(1000, 'Prezzo minimo €1.000')
    .max(100000000, 'Prezzo massimo €100.000.000')
    .optional(),

  // Caratteristiche opzionali
  rooms: z.number().min(1).max(50).optional(),
  bedrooms: z.number().min(0).max(30).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  floor: z.number().min(0, 'Il piano minimo consentito è 0').max(100).optional(),
  totalFloors: z.number().min(1).max(150).optional(),

  // Booleani
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasCellar: z.boolean().optional(),

  // Enumerazioni
  propertyType: z.enum(['residenziale', 'signorile', 'economico', 'ufficio', 'negozio']).optional(),
  state: z.enum(['ottimo', 'buono', 'discreto', 'da_ristrutturare']).optional(),
  energyClass: z.enum(['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'NC']).optional(),

  // Anno costruzione
  yearBuilt: z.number()
    .min(1800, 'Anno minimo: 1800')
    .max(new Date().getFullYear(), `Anno massimo: ${new Date().getFullYear()}`)
    .optional(),

  // Metadata
  title: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (data) => !data.totalFloors || !data.floor || data.floor <= data.totalFloors,
  {
    message: 'Il piano non può essere superiore al numero totale di piani',
    path: ['floor'],
  }
);

export type PropertyFormData = z.infer<typeof propertySchema>;

// Schema Step 3: Coordinate
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5),
  city: z.string().min(2),
  omiZone: z.string().optional(),
});

export type CoordinatesFormData = z.infer<typeof coordinatesSchema>;

// Helper per validazione campo singolo
export function validateField<T>(
  schema: z.ZodSchema<T>,
  fieldName: keyof T,
  value: any
): { valid: boolean; error?: string } {
  try {
    const fieldSchema = (schema as any).shape[fieldName];
    if (!fieldSchema) {
      return { valid: true };
    }
    fieldSchema.parse(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message };
    }
    return { valid: false, error: 'Errore di validazione' };
  }
}

// Helper per determinare campi mancanti
export function getMissingFields(data: Partial<PropertyFormData>): string[] {
  const requiredFields: (keyof PropertyFormData)[] = ['address', 'city', 'surface'];
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (!data[field]) {
      missing.push(field);
    }
  }

  return missing;
}

// Helper per calcolare completezza dati
// Considera solo i campi effettivamente mostrati nel form
export function calculateDataCompleteness(data: Partial<PropertyFormData>): number {
  const allFields: (keyof PropertyFormData)[] = [
    'address', 'city', 'surface', 'price',
    'rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'
  ];

  let filledCount = 0;

  console.log('=== DEBUG COMPLETEZZA ===');
  allFields.forEach(field => {
    const value = data[field];
    let isFilled = false;

    // Stringhe: devono essere non vuote
    if (typeof value === 'string') {
      isFilled = value.trim().length > 0;
    }
    // Numeri: devono essere validi (non NaN) e 0 è valido
    else if (typeof value === 'number') {
      isFilled = !isNaN(value);
    }

    console.log(`${field}: value="${value}", type=${typeof value}, isFilled=${isFilled}, isNaN=${typeof value === 'number' ? isNaN(value) : 'N/A'}`);

    if (isFilled) {
      filledCount++;
    }
  });

  const percentage = Math.round((filledCount / allFields.length) * 100);
  console.log(`📊 Completezza: ${filledCount}/${allFields.length} = ${percentage}%`);

  return percentage;
}
