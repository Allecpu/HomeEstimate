'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Camera, CheckCircle2, Home, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { propertySchema, type PropertyFormData, getMissingFields, calculateDataCompleteness } from '@/lib/validation';
import { Progress } from '@/components/ui/progress';
import type { PhotoConditionLabel, PhotoConditionResult } from '@/lib/photo-analysis';
import { analyzePhotoConditionFromStorage, getSavedAnalysis } from '@/lib/photo-analysis';
import { OMIDataFields } from '@/components/wizard/OMIDataFields';
import { getOMISuggestions, type OMISuggestion } from '@/lib/omi-api';

const PHOTO_CONDITION_LABELS: Record<PhotoConditionLabel, string> = {
  da_ristrutturare: 'Da ristrutturare',
  discreto: 'Discreto',
  buono: 'Buono',
  ottimo: 'Ottimo',
};

type PropertyCategory = Exclude<PropertyFormData['propertyType'], undefined>;

const PROPERTY_TYPE_PRIORITY: PropertyCategory[] = ['signorile', 'ufficio', 'negozio', 'economico', 'residenziale'];

const RAW_PROPERTY_TYPE_KEYWORDS: Record<PropertyCategory, string[]> = {
  residenziale: [
    'appartamento',
    'abitazione',
    'casa',
    'residenziale',
    'monolocale',
    'bilocale',
    'trilocale',
    'quadrilocale',
    'mansarda',
    'loft',
    'villetta',
  ],
  signorile: [
    'signorile',
    'prestigio',
    'prestigiosa',
    'lusso',
    'lussuosa',
    'attico',
    'penthouse',
    'esclusivo',
    'di rappresentanza',
  ],
  economico: [
    'economico',
    'popolare',
    'sociale',
    'investimento',
    'occasione',
  ],
  ufficio: [
    'ufficio',
    'studio professionale',
    'studio medico',
    'studio dentistico',
    'coworking',
    'direzionale',
  ],
  negozio: [
    'negozio',
    'locale commerciale',
    'attività commerciale',
    'vetrina',
    'showroom',
    'bottega',
    'shop',
  ],
};

const sanitizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const PROPERTY_TYPE_KEYWORDS: Record<PropertyCategory, string[]> = Object.fromEntries(
  (Object.entries(RAW_PROPERTY_TYPE_KEYWORDS) as [PropertyCategory, string[]][]).map(([category, words]) => [
    category,
    words.map((word) => sanitizeText(word)),
  ]),
) as Record<PropertyCategory, string[]>;

function guessPropertyTypeFromText(text: string): PropertyCategory | null {
  if (!text) {
    return null;
  }

  const normalized = sanitizeText(text);
  let bestCategory: PropertyCategory | null = null;
  let bestScore = 0;

  for (const category of PROPERTY_TYPE_PRIORITY) {
    const keywords = PROPERTY_TYPE_KEYWORDS[category];
    let score = 0;
    for (const keyword of keywords) {
      if (keyword && normalized.includes(keyword)) {
        score += 1;
      }
    }

    if (score > 0 && (score > bestScore || !bestCategory)) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

interface Step2Props {
  onNext: (data: PropertyFormData & {
    photoCondition?: PhotoConditionResult;
    photoStorageId?: string;
    photoStorageCount?: number;
  }) => void;
  onBack: () => void;
  initialData?: Partial<PropertyFormData> & {
    photoCondition?: PhotoConditionResult;
    photoStorageId?: string;
    photoStorageCount?: number;
  };
}

export function Step2CompleteData({ onNext, onBack, initialData }: Step2Props) {
  const toNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const normalised = value.replace(/\./g, '').replace(',', '.');
      if (normalised.trim().length === 0) {
        return undefined;
      }

      const parsed = Number(normalised);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  const parseFloorValue = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      const parsed = Math.floor(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase().replace(/\./g, '').replace(',', '.').trim();
      if (normalized.length === 0) {
        return undefined;
      }

      const aliasKey = normalized.replace(/\s+/g, '');
      const synonyms: Record<string, number> = {
        p: 0,
        pt: 0,
        t: 0,
        terra: 0,
        pianoterra: 0,
        pianorialzato: 0,
        prialzato: 0,
        rialzato: 0,
      };

      if (aliasKey in synonyms) {
        return synonyms[aliasKey];
      }

      const digitsOnly = aliasKey.replace(/[^\d-]/g, '');
      if (digitsOnly.length === 0) {
        return undefined;
      }

      const parsed = Number.parseInt(digitsOnly, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }

    return undefined;
  };

  const parseNonNegativeNumber = (value: unknown): number | undefined => {
    const parsed = toNumber(value);
    if (parsed === undefined || parsed < 0) {
      return undefined;
    }
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseNonNegativeInteger = (value: unknown): number | undefined => {
    const parsed = toNumber(value);
    if (parsed === undefined || parsed < 0) {
      return undefined;
    }
    const floored = Math.floor(parsed);
    return Number.isFinite(floored) ? floored : undefined;
  };

  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoConditionResult | undefined>(initialData?.photoCondition);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loadingSavedAnalysis, setLoadingSavedAnalysis] = useState(false);
  const [omiSuggestions, setOmiSuggestions] = useState<OMISuggestion | null>(null);
  const attemptedSavedAnalysisId = useRef<string | null>(null);

  const photoStorageId = initialData?.photoStorageId;
  const photoStorageCount = initialData?.photoStorageCount ?? 0;
  const hasPhotoArchive = Boolean(photoStorageId) && photoStorageCount > 0;

  const handleAnalyzePhotos = async () => {
    if (!photoStorageId) {
      setAnalysisError('Nessuna foto salvata dall\'estensione. Usa l\'estensione per scaricarle prima.');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await analyzePhotoConditionFromStorage(photoStorageId, 'it');
      setPhotoAnalysis(result);

      const currentState = getValues('state');
      if (!currentState) {
        setValue('state', result.label);
      }
    } catch (error) {
      console.error('Photo analysis from storage failed', error);
      const message =
        error instanceof Error ? error.message : 'Errore durante l\'analisi delle foto';
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (!initialData) {
      return {} as Partial<PropertyFormData>;
    }

    const result: Partial<PropertyFormData> = {};

    if (initialData.address !== undefined) {
      result.address = initialData.address;
    }

    if (initialData.city !== undefined) {
      result.city = initialData.city;
    }

    const surface = toNumber(initialData.surface);
    if (surface !== undefined) {
      result.surface = surface;
    }

    const price = toNumber(initialData.price);
    if (price !== undefined) {
      result.price = price;
    }

    const pricePerSqm = toNumber(initialData.pricePerSqm);
    if (pricePerSqm !== undefined) {
      result.pricePerSqm = pricePerSqm;
    }

    const condoFeesMonthly = toNumber(initialData.condoFeesMonthly);
    if (condoFeesMonthly !== undefined) {
      result.condoFeesMonthly = condoFeesMonthly;
    }

    const rooms = toNumber(initialData.rooms);
    if (rooms !== undefined) {
      result.rooms = rooms;
    }

    const bedrooms = toNumber(initialData.bedrooms);
    if (bedrooms !== undefined) {
      result.bedrooms = bedrooms;
    }

    const bathrooms = toNumber(initialData.bathrooms);
    if (bathrooms !== undefined) {
      result.bathrooms = bathrooms;
    }

    const floor = parseFloorValue(initialData.floor);
    if (floor !== undefined) {
      result.floor = floor;
    }

    const totalFloors = toNumber(initialData.totalFloors);
    if (totalFloors !== undefined) {
      result.totalFloors = totalFloors;
    }

    const surfaceCommercial = toNumber(initialData.surfaceCommercial);
    if (surfaceCommercial !== undefined) {
      result.surfaceCommercial = surfaceCommercial;
    }

    const surfaceUsable = toNumber(initialData.surfaceUsable);
    if (surfaceUsable !== undefined) {
      result.surfaceUsable = surfaceUsable;
    }

    const yearBuilt = toNumber(initialData.yearBuilt);
    if (yearBuilt !== undefined) {
      result.yearBuilt = yearBuilt;
    }

    // New fields added
    if (initialData.hasElevator !== undefined) {
      result.hasElevator = initialData.hasElevator;
    }

    if (initialData.hasParking !== undefined) {
      result.hasParking = initialData.hasParking;
    }

    if (initialData.hasBalcony !== undefined) {
      result.hasBalcony = initialData.hasBalcony;
    }

    if (initialData.hasCellar !== undefined) {
      result.hasCellar = initialData.hasCellar;
    }

    if (initialData.hasGarden !== undefined) {
      result.hasGarden = initialData.hasGarden;
    }

    if (initialData.hasAirConditioning !== undefined) {
      result.hasAirConditioning = initialData.hasAirConditioning;
    }

    if (initialData.parkingIncluded !== undefined) {
      result.parkingIncluded = initialData.parkingIncluded;
    }

    if (initialData.propertyType !== undefined) {
      result.propertyType = initialData.propertyType;
    }

    if (initialData.state !== undefined) {
      result.state = initialData.state;
    }

    if (initialData.energyClass !== undefined) {
      result.energyClass = initialData.energyClass;
    }

    const energyPerformance = toNumber(initialData.energyPerformance);
    if (energyPerformance !== undefined) {
      result.energyPerformance = energyPerformance;
    }

    if (initialData.orientation !== undefined) {
      result.orientation = initialData.orientation;
    }

    if (initialData.heating !== undefined) {
      result.heating = initialData.heating;
    }

    if (initialData.heatingType !== undefined) {
      result.heatingType = initialData.heatingType;
    }

    if (initialData.gardenType !== undefined) {
      result.gardenType = initialData.gardenType;
    }

    if (initialData.title !== undefined) {
      result.title = initialData.title;
    }

    if (initialData.description !== undefined) {
      result.description = initialData.description;
    }

    return result;
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: processedData,
  });

  // Update form when initialData changes (e.g., from extension)
  const processedDataSignature = useMemo(
    () => JSON.stringify(processedData),
    [processedData]
  );

  const lastAppliedSignatureRef = useRef<string | undefined>(undefined);

  const lastAutoPricePerSqmSignatureRef = useRef<string | undefined>(undefined);
  const pricePerSqmManuallyEditedRef = useRef(false);
  const autoPropertyTypeRef = useRef<PropertyCategory | null>(null);

  const watchedPrice = useWatch({ control, name: 'price' });
  const watchedSurface = useWatch({ control, name: 'surface' });
  const watchedAddress = watch('address');
  const watchedCity = watch('city');
  const watchedDescription = watch('description');
  const watchedTitle = watch('title');
  const watchedPropertyType = watch('propertyType');
  const propertyTypeDirty = Boolean((dirtyFields as { propertyType?: boolean }).propertyType);

  const pricePerSqmField = register('pricePerSqm', {
    valueAsNumber: true,
    onChange: (event) => {
      const value = event?.target?.value ?? '';
      pricePerSqmManuallyEditedRef.current = value !== '';
    },
  });

  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) {
      return;
    }

    if (processedDataSignature === lastAppliedSignatureRef.current) {
      return;
    }

    lastAppliedSignatureRef.current = processedDataSignature;
    reset(processedData);
  }, [initialData, processedData, processedDataSignature, reset]);

  useEffect(() => {
    if (typeof watchedSurface !== 'number' || !Number.isFinite(watchedSurface) || watchedSurface <= 0) {
      return;
    }

    if (typeof watchedPrice !== 'number' || !Number.isFinite(watchedPrice) || watchedPrice <= 0) {
      return;
    }

    const signature = `${watchedPrice}-${watchedSurface}`;
    if (signature !== lastAutoPricePerSqmSignatureRef.current) {
      lastAutoPricePerSqmSignatureRef.current = signature;
      pricePerSqmManuallyEditedRef.current = false;
    }

    if (pricePerSqmManuallyEditedRef.current) {
      return;
    }

    const computed = Number((watchedPrice / watchedSurface).toFixed(2));
    const currentValue = getValues('pricePerSqm');
    const hasValidCurrentValue = typeof currentValue === 'number' && Number.isFinite(currentValue);

    if (!hasValidCurrentValue || Math.abs((currentValue as number) - computed) > 0.009) {
      setValue('pricePerSqm', computed, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedPrice, watchedSurface, getValues, setValue]);

  // Sync photo analysis state with initialData
  useEffect(() => {
    setPhotoAnalysis(initialData?.photoCondition);
    setAnalysisError(null);
  }, [initialData?.photoCondition]);

  // Auto-load saved analysis when photoStorageId is available
  useEffect(() => {
    if (!photoStorageId) {
      attemptedSavedAnalysisId.current = null;
    }
  }, [photoStorageId]);

  useEffect(() => {
    const loadSavedAnalysis = async () => {
      // Don't load if we already have an analysis or no storage ID
      if (photoAnalysis || !photoStorageId) {
        return;
      }

      if (attemptedSavedAnalysisId.current === photoStorageId) {
        return;
      }

      attemptedSavedAnalysisId.current = photoStorageId;

      setLoadingSavedAnalysis(true);
      try {
        const savedResult = await getSavedAnalysis(photoStorageId);
        if (savedResult) {
          console.log('Loaded saved analysis for listing:', photoStorageId);
          setPhotoAnalysis(savedResult);

          // Auto-populate state field if empty
          const currentState = getValues('state');
          if (!currentState) {
            setValue('state', savedResult.label);
          }
        }
      } catch (error) {
        console.error('Failed to load saved analysis:', error);
        // Don't show error to user - this is an optional enhancement
      } finally {
        setLoadingSavedAnalysis(false);
      }
    };

    loadSavedAnalysis();
  }, [photoStorageId, photoAnalysis, getValues, setValue]);

  useEffect(() => {
    if (propertyTypeDirty) {
      return;
    }

    const combinedText = `${watchedTitle ?? ''} ${watchedDescription ?? ''}`.trim();

    if (!combinedText) {
      autoPropertyTypeRef.current = null;
      return;
    }

    const inferred = guessPropertyTypeFromText(combinedText);
    if (!inferred) {
      return;
    }

    const lastApplied = autoPropertyTypeRef.current;
    const currentValue = watchedPropertyType ?? null;
    const isDefaultValue = currentValue === 'residenziale';
    const hasNoSelection = currentValue === null || currentValue === undefined || currentValue === '';
    const previouslyApplied = lastApplied !== null && currentValue === lastApplied;
    const shouldOverrideDefault = isDefaultValue && inferred !== 'residenziale';
    const shouldApply = (hasNoSelection || previouslyApplied || shouldOverrideDefault) && currentValue !== inferred;

    if (shouldApply) {
      autoPropertyTypeRef.current = inferred;
      setValue('propertyType', inferred, { shouldDirty: false, shouldTouch: false });
    } else if (lastApplied !== inferred && (previouslyApplied || hasNoSelection)) {
      autoPropertyTypeRef.current = inferred;
    }
  }, [watchedDescription, watchedTitle, watchedPropertyType, setValue, propertyTypeDirty]);

  // Auto-suggest OMI data based on address

  useEffect(() => {
    // Solo se abbiamo indirizzo e città
    if (!watchedAddress || !watchedCity || watchedAddress.length < 5 || watchedCity.length < 2) {
      setOmiSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const suggestions = await getOMISuggestions({
          address: watchedAddress,
          city: watchedCity,
          property_description: watchedDescription,
        });
        setOmiSuggestions(suggestions);
      } catch (error) {
        console.error('Failed to get OMI suggestions:', error);
        setOmiSuggestions(null);
      }
    };

    // Debounce per evitare troppe richieste
    const timeoutId = setTimeout(fetchSuggestions, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchedAddress, watchedCity, watchedDescription]);

  const conditionScore = photoAnalysis ? Math.round(photoAnalysis.score) : 0;
  const conditionConfidence = photoAnalysis ? Math.round(photoAnalysis.confidence * 100) : 0;
  const photoHighlights = photoAnalysis?.per_photo?.slice(0, 3) ?? [];

  // Format number with Italian thousands separator
  const formatPrice = (value: number | string | undefined): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const numericValue = toNumber(value);
    return numericValue === undefined ? '' : numericValue.toLocaleString('it-IT');
  };

  // Parse formatted price back to number
  const parsePrice = (value: string): number | undefined => {
    if (!value) return undefined;
    return toNumber(value);
  };

  const watchedFormData = useWatch({ control }) as Partial<PropertyFormData> | undefined;
  const formData: Partial<PropertyFormData> = watchedFormData ?? {};
  const effectiveFormData: Partial<PropertyFormData> = {
    ...processedData,
    ...formData,
  };

  const missingFields = getMissingFields(effectiveFormData);
  const completeness = calculateDataCompleteness(effectiveFormData);
  const progressValue = Math.min(100, Math.max(0, completeness));

  // Check if characteristics section is complete
  const characteristicsFields = ['rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'];
  const isCharacteristicsComplete = characteristicsFields.every(field => {
    const value = effectiveFormData[field as keyof PropertyFormData];
    // For numbers, check if it's a valid number (not undefined, null, NaN, or empty string)
    if (typeof value === 'number') {
      return !isNaN(value);
    }
    return value !== undefined && value !== null && value !== '';
  });

const onSubmit = (data: PropertyFormData) => {
    const payload = {
      ...data,
      photoCondition: photoAnalysis,
      ...(photoStorageId ? { photoStorageId, photoStorageCount } : {}),
    };

    onNext(payload);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Completa i Dati dell&apos;Immobile
              </CardTitle>
              <CardDescription>
                I campi evidenziati sono obbligatori. Piu dati fornisci, piu accurata sara la stima.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{progressValue}%</p>
              <p className="text-xs text-gray-500">Completezza</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressValue} className="h-2" />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dati Obbligatori */}
        <Card className={missingFields.length > 0 ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {missingFields.length > 0 ? (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Dati Obbligatori
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Dati Obbligatori Completi
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">
                Indirizzo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                placeholder="Via Roma 123"
                {...register('address')}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                Citta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="Milano"
                {...register('city')}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="surface">
                Superficie (m^2) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="surface"
                type="text"
                inputMode="decimal"
                placeholder="80"
                {...register('surface', {
                  setValueAs: (value) => parseNonNegativeNumber(value),
                })}
                className={errors.surface ? 'border-red-500' : ''}
              />
              {errors.surface && (
                <p className="text-sm text-red-500">{errors.surface.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prezzo Richiesto (EUR)</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input
                    id="price"
                    type="text"
                    placeholder="250.000"
                    value={formatPrice(field.value)}
                    onChange={(e) => field.onChange(parsePrice(e.target.value))}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerSqm">Prezzo al m^2 (EUR)</Label>
              <Input
                id="pricePerSqm"
                type="number"
                step="0.01"
                placeholder="3.200"
                {...pricePerSqmField}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condoFeesMonthly">Spese condominiali (EUR/mese)</Label>
              <Controller
                name="condoFeesMonthly"
                control={control}
                render={({ field }) => (
                  <Input
                    id="condoFeesMonthly"
                    type="text"
                    placeholder="150"
                    value={formatPrice(field.value)}
                    onChange={(event) => field.onChange(parsePrice(event.target.value))}
                    className={errors.condoFeesMonthly ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.condoFeesMonthly && (
                <p className="text-sm text-red-500">{errors.condoFeesMonthly.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Caratteristiche */}
        <Card className={isCharacteristicsComplete ? 'border-green-300 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {isCharacteristicsComplete && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              Caratteristiche
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rooms">Locali</Label>
              <Input
                id="rooms"
                type="text"
                inputMode="numeric"
                placeholder="3"
                {...register('rooms', {
                  setValueAs: (value) => parseNonNegativeInteger(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Camere da letto</Label>
              <Input
                id="bedrooms"
                type="text"
                inputMode="numeric"
                placeholder="2"
                {...register('bedrooms', {
                  setValueAs: (value) => parseNonNegativeInteger(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bagni</Label>
              <Input
                id="bathrooms"
                type="text"
                inputMode="numeric"
                placeholder="1"
                {...register('bathrooms', {
                  setValueAs: (value) => parseNonNegativeInteger(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Piano</Label>
              <Input
                id="floor"
                type="text"
                placeholder="2"
                inputMode="numeric"
                {...register('floor', {
                  setValueAs: (value) => parseFloorValue(value),
                })}
                className={errors.floor ? 'border-red-500' : ''}
              />
              {errors.floor && (
                <p className="text-sm text-red-500">{errors.floor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalFloors">Piani totali edificio</Label>
              <Input
                id="totalFloors"
                type="text"
                placeholder="5"
                inputMode="numeric"
                {...register('totalFloors', {
                  setValueAs: (value) => parseNonNegativeInteger(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surfaceCommercial">Superficie commerciale (m^2)</Label>
              <Input
                id="surfaceCommercial"
                type="text"
                placeholder="64"
                inputMode="decimal"
                {...register('surfaceCommercial', {
                  setValueAs: (value) => parseNonNegativeNumber(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surfaceUsable">Superficie calpestabile (m^2)</Label>
              <Input
                id="surfaceUsable"
                type="text"
                placeholder="62"
                inputMode="decimal"
                {...register('surfaceUsable', {
                  setValueAs: (value) => parseNonNegativeNumber(value),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Anno costruzione</Label>
              <Input
                id="yearBuilt"
                type="text"
                placeholder="1980"
                inputMode="numeric"
                {...register('yearBuilt', {
                  setValueAs: (value) => {
                    const parsed = toNumber(value);
                    const currentYear = new Date().getFullYear();
                    if (
                      parsed === undefined ||
                      parsed < 1800 ||
                      parsed > currentYear
                    ) {
                      return undefined;
                    }
                    return Math.floor(parsed);
                  }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dotazioni e Servizi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dotazioni e Servizi</CardTitle>
            <CardDescription>Seleziona i servizi presenti nell&apos;immobile</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Controller
                name="hasElevator"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasElevator"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasElevator" className="cursor-pointer">Ascensore</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="hasParking"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasParking"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasParking" className="cursor-pointer">Posto Auto / Box</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="hasBalcony"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasBalcony"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasBalcony" className="cursor-pointer">Balcone / Terrazzo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="hasCellar"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasCellar"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasCellar" className="cursor-pointer">Cantina</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="parkingIncluded"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="parkingIncluded"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="parkingIncluded" className="cursor-pointer">Box incluso nel prezzo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="hasGarden"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasGarden"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasGarden" className="cursor-pointer">Giardino</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="hasAirConditioning"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="hasAirConditioning"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                  />
                )}
              />
              <Label htmlFor="hasAirConditioning" className="cursor-pointer">Aria condizionata</Label>
            </div>
          </CardContent>
        </Card>

        {/* Analisi Foto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="w-5 h-5" />
              Analisi delle Foto
            </CardTitle>
            <CardDescription>
              Gestisci il download delle foto e avvia l&apos;analisi visiva direttamente dal portale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Foto archiviate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {hasPhotoArchive ? `${photoStorageCount} foto` : 'Nessuna foto salvata'}
                </p>
                {photoStorageId && (
                  <p className="text-xs text-gray-500 break-all mt-1">
                    ID archivio: {photoStorageId}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAnalyzePhotos}
                disabled={!hasPhotoArchive || analysisLoading}
                className="md:self-start"
              >
                {analysisLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisi in corso...
                  </span>
                ) : (
                  'Avvia analisi AI'
                )}
              </Button>
            </div>

            {analysisError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{analysisError}</span>
              </div>
            )}

            {loadingSavedAnalysis && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Caricamento analisi salvata...</span>
              </div>
            )}

            {photoAnalysis ? (
              <>
                <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Analisi completata e salvata</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Condizione stimata</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {PHOTO_CONDITION_LABELS[photoAnalysis.label] ?? photoAnalysis.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Punteggio qualita (0-100)</p>
                    <div className="flex items-center gap-3">
                      <Progress value={conditionScore} className="w-full h-2" />
                      <span className="text-sm font-medium text-gray-700 min-w-[3ch] text-right">
                        {conditionScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidenza modello</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {conditionConfidence}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Sintesi</p>
                  <p className="text-sm leading-relaxed text-gray-700">
                    {photoAnalysis.reasoning}
                  </p>
                </div>

                {photoHighlights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Dettagli principali</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {photoHighlights.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="rounded-md border border-gray-200 p-3">
                          <p className="text-sm font-medium text-gray-800">{item.summary}</p>
                          {item.issues && (
                            <p className="mt-1 text-xs text-red-600">Criticita: {item.issues}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                Usa il pulsante dell&apos;estensione per scaricare le foto e poi avvia qui l&apos;analisi AI per ottenere una valutazione automatica dello stato dell&apos;immobile.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipologia e Stato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipologia e Stato</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Tipologia</Label>
              <Controller
                name="propertyType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="propertyType">
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residenziale">Residenziale</SelectItem>
                      <SelectItem value="signorile">Signorile</SelectItem>
                      <SelectItem value="economico">Economico</SelectItem>
                      <SelectItem value="ufficio">Ufficio</SelectItem>
                      <SelectItem value="negozio">Negozio</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Stato</Label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ottimo">Ottimo</SelectItem>
                      <SelectItem value="buono">Buono</SelectItem>
                      <SelectItem value="discreto">Discreto</SelectItem>
                      <SelectItem value="da_ristrutturare">Da Ristrutturare</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="energyClass">Classe Energetica</Label>
              <Controller
                name="energyClass"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="energyClass">
                      <SelectValue placeholder="Seleziona classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="A2">A2</SelectItem>
                      <SelectItem value="A1">A1</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="NC">Non Certificato</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dettagli aggiuntivi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dettagli aggiuntivi</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientamento</Label>
              <Input
                id="orientation"
                placeholder="Nord, Sud, Est, Ovest"
                {...register('orientation')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gardenType">Tipo di giardino</Label>
              <Input
                id="gardenType"
                placeholder="Giardino comune"
                {...register('gardenType')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heating">Riscaldamento</Label>
              <Input
                id="heating"
                placeholder="Riscaldamento autonomo"
                {...register('heating')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heatingType">Tipo riscaldamento</Label>
              <Input
                id="heatingType"
                placeholder="Autonomo"
                {...register('heatingType')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="energyPerformance">Prestazione energetica (kWh/m^2 anno)</Label>
              <Input
                id="energyPerformance"
                type="text"
                inputMode="decimal"
                placeholder="434,51"
                {...register('energyPerformance', {
                  setValueAs: (value) => parseNonNegativeNumber(value),
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Descrizione */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informazioni Aggiuntive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo Annuncio</Label>
              <Input
                id="title"
                placeholder="Es. Appartamento luminoso in centro"
                {...register('title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                placeholder="Descrizione dettagliata dell'immobile..."
                rows={4}
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dati OMI */}
        <Controller
          name="propertyTypeOMI"
          control={control}
          render={({ field: propertyTypeField }) => (
            <Controller
              name="zonaOMI"
              control={control}
              render={({ field: zonaOMIField }) => (
                <OMIDataFields
                  city={useWatch({ control, name: 'city' })}
                  propertyTypeOMI={propertyTypeField.value}
                  zonaOMI={zonaOMIField.value}
                  onPropertyTypeChange={propertyTypeField.onChange}
                  onZonaOMIChange={zonaOMIField.onChange}
                  suggestedPropertyType={omiSuggestions?.suggested_property_type}
                  suggestedZone={omiSuggestions?.suggested_zone}
                />
              )}
            />
          )}
        />

        {/* Azioni */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Indietro
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            disabled={missingFields.length > 0}
          >
            Continua
          </Button>
        </div>
      </form>
    </div>
  );
}



