'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { propertySchema, type PropertyFormData, getMissingFields, calculateDataCompleteness } from '@/lib/validation';
import { Progress } from '@/components/ui/progress';

interface Step2Props {
  onNext: (data: PropertyFormData) => void;
  onBack: () => void;
  initialData?: Partial<PropertyFormData>;
}

export function Step2CompleteData({ onNext, onBack, initialData }: Step2Props) {
  // Debug initialData
  console.log('🔍 RAW initialData keys:', initialData ? Object.keys(initialData) : 'none');
  if (initialData) {
    console.log('🔍 totalFloors in initialData:', 'totalFloors' in initialData, 'value:', initialData.totalFloors);
    console.log('🔍 yearBuilt in initialData:', 'yearBuilt' in initialData, 'value:', initialData.yearBuilt);
  }

  // Helper to safely convert to number, avoiding NaN
  const toNumber = (value: any): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const result = typeof num === 'number' && !isNaN(num) ? num : undefined;
    return result;
  };

  // Convert string values to numbers for numeric fields - explicitly map only known fields
  const processedData: Partial<PropertyFormData> = {};
  if (initialData) {
    if (initialData.address) processedData.address = initialData.address;
    if (initialData.city) processedData.city = initialData.city;
    if (initialData.surface !== undefined) processedData.surface = toNumber(initialData.surface);
    if (initialData.price !== undefined) processedData.price = toNumber(initialData.price);
    if (initialData.rooms !== undefined) processedData.rooms = toNumber(initialData.rooms);
    if (initialData.bedrooms !== undefined) processedData.bedrooms = toNumber(initialData.bedrooms);
    if (initialData.bathrooms !== undefined) processedData.bathrooms = toNumber(initialData.bathrooms);
    if (initialData.floor !== undefined) processedData.floor = toNumber(initialData.floor);
    if (initialData.totalFloors !== undefined) processedData.totalFloors = toNumber(initialData.totalFloors);
    if (initialData.yearBuilt !== undefined) processedData.yearBuilt = toNumber(initialData.yearBuilt);
  }

  console.log('🔍 processedData:', processedData);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: processedData,
  });

  // Update form when initialData changes (e.g., from extension)
  useEffect(() => {
    console.log('useEffect triggered, initialData:', initialData);
    if (initialData && Object.keys(initialData).length > 0) {
      const updatedData: any = {};

      if (initialData.address) updatedData.address = initialData.address;
      if (initialData.city) updatedData.city = initialData.city;

      const surface = toNumber(initialData.surface);
      if (surface !== undefined) updatedData.surface = surface;

      const price = toNumber(initialData.price);
      if (price !== undefined) updatedData.price = price;

      const rooms = toNumber(initialData.rooms);
      if (rooms !== undefined) updatedData.rooms = rooms;

      const bedrooms = toNumber(initialData.bedrooms);
      if (bedrooms !== undefined) updatedData.bedrooms = bedrooms;

      const bathrooms = toNumber(initialData.bathrooms);
      if (bathrooms !== undefined) updatedData.bathrooms = bathrooms;

      const floor = toNumber(initialData.floor);
      if (floor !== undefined) updatedData.floor = floor;

      const totalFloors = toNumber(initialData.totalFloors);
      if (totalFloors !== undefined) updatedData.totalFloors = totalFloors;

      const yearBuilt = toNumber(initialData.yearBuilt);
      if (yearBuilt !== undefined) updatedData.yearBuilt = yearBuilt;

      console.log('🔍 Calling reset() with updatedData:', updatedData);
      console.log('🔍 updatedData has totalFloors?', 'totalFloors' in updatedData);
      console.log('🔍 updatedData has yearBuilt?', 'yearBuilt' in updatedData);
      reset(updatedData);
      console.log('reset() called successfully');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialData), reset]);

  // Format number with Italian thousands separator
  const formatPrice = (value: number | string | undefined): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
    if (isNaN(num)) return '';
    return num.toLocaleString('it-IT');
  };

  // Parse formatted price back to number
  const parsePrice = (value: string): number | undefined => {
    if (!value) return undefined;
    const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? undefined : num;
  };

  const formData = watch();

  // Debug: log form data to see what's happening
  console.log('Form Data:', formData);
  console.log('Missing Fields Check:', {
    address: formData.address,
    city: formData.city,
    surface: formData.surface
  });

  const missingFields = getMissingFields(formData);
  const completeness = calculateDataCompleteness(formData);

  console.log('Missing Fields:', missingFields);
  console.log('Completeness:', completeness);

  // Check if characteristics section is complete
  const characteristicsFields = ['rooms', 'bedrooms', 'bathrooms', 'floor', 'totalFloors', 'yearBuilt'];
  const isCharacteristicsComplete = characteristicsFields.every(field => {
    const value = formData[field as keyof PropertyFormData];
    // For numbers, check if it's a valid number (not undefined, null, NaN, or empty string)
    if (typeof value === 'number') {
      return !isNaN(value);
    }
    return value !== undefined && value !== null && value !== '';
  });

  console.log('Characteristics values:', {
    rooms: formData.rooms,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    floor: formData.floor,
    totalFloors: formData.totalFloors,
    yearBuilt: formData.yearBuilt,
  });
  console.log('isCharacteristicsComplete:', isCharacteristicsComplete);

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
              <p className="text-2xl font-bold text-blue-600">{completeness}%</p>
              <p className="text-xs text-gray-500">Completezza</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} className="h-2" />
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
                min="-2"
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
                  setValueAs: (v) => {
                    console.log('✏️ totalFloors setValueAs input:', v, 'type:', typeof v);
                    if (v === '' || v === null || v === undefined) return undefined;
                    const num = Number(v);
                    console.log('✏️ totalFloors parsed:', num, 'isNaN:', isNaN(num));
                    if (isNaN(num) || num < 0) return undefined;
                    const result = Math.floor(num);
                    console.log('✏️ totalFloors result:', result);
                    return result;
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
                  setValueAs: (v) => {
                    console.log('✏️ yearBuilt setValueAs input:', v, 'type:', typeof v);
                    if (v === '' || v === null || v === undefined) return undefined;
                    const num = Number(v);
                    const currentYear = new Date().getFullYear();
                    console.log('✏️ yearBuilt parsed:', num, 'isNaN:', isNaN(num));
                    if (isNaN(num) || num < 1800 || num > currentYear) return undefined;
                    const result = Math.floor(num);
                    console.log('✏️ yearBuilt result:', result);
                    return result;
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
