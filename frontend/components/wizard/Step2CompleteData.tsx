'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { propertySchema, type PropertyFormData, getMissingFields, calculateDataCompleteness } from '@/lib/validation';
import { Progress } from '@/components/ui/progress';

interface Step2Props {
  onNext: (data: PropertyFormData) => void;
  onBack: () => void;
  initialData?: Partial<PropertyFormData>;
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

    const floor = toNumber(initialData.floor);
    if (floor !== undefined) {
      result.floor = floor;
    }

    const totalFloors = toNumber(initialData.totalFloors);
    if (totalFloors !== undefined) {
      result.totalFloors = totalFloors;
    }

    const yearBuilt = toNumber(initialData.yearBuilt);
    if (yearBuilt !== undefined) {
      result.yearBuilt = yearBuilt;
    }

    return result;
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: processedData,
  });

  // Update form when initialData changes (e.g., from extension)
  const processedDataSignature = useMemo(
    () => JSON.stringify(processedData),
    [processedData]
  );

  const lastAppliedSignatureRef = useRef<string>();

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
    onNext(data);
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
                Completa i Dati dell'Immobile
              </CardTitle>
              <CardDescription>
                I campi evidenziati sono obbligatori. Più dati fornisci, più accurata sarà la stima.
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
                Città <span className="text-red-500">*</span>
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
                Superficie (m²) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="surface"
                type="number"
                placeholder="80"
                {...register('surface', { valueAsNumber: true })}
                className={errors.surface ? 'border-red-500' : ''}
              />
              {errors.surface && (
                <p className="text-sm text-red-500">{errors.surface.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prezzo Richiesto (€)</Label>
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
                type="number"
                placeholder="3"
                min="0"
                {...register('rooms', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms">Camere da letto</Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="2"
                min="0"
                {...register('bedrooms', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bagni</Label>
              <Input
                id="bathrooms"
                type="number"
                placeholder="1"
                min="0"
                {...register('bathrooms', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Piano</Label>
              <Input
                id="floor"
                type="number"
                placeholder="2"
                min="0"
                {...register('floor', { valueAsNumber: true })}
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
                type="number"
                placeholder="5"
                min="0"
                {...register('totalFloors', {
                  setValueAs: (value) => {
                    const parsed = toNumber(value);
                    if (parsed === undefined || parsed < 0) {
                      return undefined;
                    }
                    return Math.floor(parsed);
                  }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Anno costruzione</Label>
              <Input
                id="yearBuilt"
                type="number"
                placeholder="1980"
                min="1800"
                max={new Date().getFullYear()}
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
