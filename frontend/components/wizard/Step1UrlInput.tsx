'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link2, Loader2, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageGallery } from '@/components/wizard/ImageGallery';
import { urlSchema, type UrlFormData } from '@/lib/validation';

interface Step1Props {
  onNext: (data: any) => void;
  initialUrl?: string;
}

export function Step1UrlInput({ onNext, initialUrl }: Step1Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [extensionDataAvailable, setExtensionDataAvailable] = useState(false);

  const parsedImages = useMemo(() => {
    if (!parsedData || typeof parsedData !== 'object') {
      return [] as Array<string | Record<string, unknown>>;
    }

    const source = parsedData as Record<string, unknown>;
    const candidateKeys = [
      'images',
      'photos',
      'gallery',
      'galleryImages',
      'imageUrls',
      'image_urls',
      'pictureUrls',
    ];

    const findArray = (target: Record<string, unknown> | undefined): unknown[] | null => {
      if (!target) {
        return null;
      }

      for (const key of candidateKeys) {
        const value = target[key];
        if (Array.isArray(value) && value.length > 0) {
          return value;
        }
      }

      return null;
    };

    const directArray = findArray(source);
    if (directArray) {
      return directArray as Array<string | Record<string, unknown>>;
    }

    const mediaValue = source['media'];
    if (Array.isArray(mediaValue) && mediaValue.length > 0) {
      return mediaValue as Array<string | Record<string, unknown>>;
    }

    if (mediaValue && typeof mediaValue === 'object') {
      const nested = findArray(mediaValue as Record<string, unknown>);
      if (nested) {
        return nested as Array<string | Record<string, unknown>>;
      }
    }

    return [] as Array<string | Record<string, unknown>>;
  }, [parsedData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: initialUrl || '',
    },
  });

  // Check for data from browser extension
  useEffect(() => {
    const checkExtensionData = () => {
      try {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const extensionData = urlParams.get('extensionData');

        if (extensionData) {
          const parsed = JSON.parse(decodeURIComponent(extensionData));
          console.log('Extension data received from URL:', parsed);
          setParsedData(parsed);
          setExtensionDataAvailable(true);

          // Clean URL without reloading
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // Fallback: check localStorage
        const data = localStorage.getItem('homeEstimateExtensionData');
        if (data) {
          const parsed = JSON.parse(data);
          console.log('Extension data received from localStorage:', parsed);
          setParsedData(parsed);
          setExtensionDataAvailable(true);
          localStorage.removeItem('homeEstimateExtensionData');
        }
      } catch (error) {
        console.error('Error reading extension data:', error);
      }
    };

    // Check immediately
    checkExtensionData();

    // Listen for custom event
    const handleExtensionData = (e: any) => {
      console.log('Extension data event received:', e.detail);
      setParsedData(e.detail);
      setExtensionDataAvailable(true);
    };

    window.addEventListener('homeEstimateDataReceived', handleExtensionData);

    return () => {
      window.removeEventListener('homeEstimateDataReceived', handleExtensionData);
    };
  }, []);

  // Function to use extension data
  const useExtensionData = () => {
    if (parsedData) {
      onNext(parsedData);
    }
  };

  const onSubmit = async (data: UrlFormData) => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      // Chiamata API al backend per parsing
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      });

      if (!response.ok) {
        throw new Error('Errore nel parsing dell\'URL');
      }

      const result = await response.json();
      setParsedData(result);

      // Dopo 1 secondo passa allo step successivo
      setTimeout(() => {
        onNext(result);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Extension data notification */}
      {extensionDataAvailable && parsedData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Dati dall'Extension Pronti!
            </CardTitle>
            <CardDescription className="text-blue-600">
              L'extension del browser ha estratto i dati dell'annuncio. Clicca il pulsante qui sotto per usarli.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={useExtensionData} className="w-full bg-blue-600 hover:bg-blue-700">
              Usa Dati dall'Extension
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Inserisci URL Annuncio
          </CardTitle>
          <CardDescription>
            Incolla il link dell'annuncio da Idealista, Immobiliare.it o Casa.it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL Annuncio</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.idealista.it/immobile/..."
                {...register('url')}
                disabled={isLoading}
                className={errors.url ? 'border-red-500' : ''}
              />
              {errors.url && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.url.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Badge variant="outline">Idealista</Badge>
              <Badge variant="outline">Immobiliare.it</Badge>
              <Badge variant="outline">Casa.it</Badge>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                'Analizza Annuncio'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview dati estratti */}
      {parsedData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Dati Estratti con Successo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {parsedData.address && (
                <div>
                  <p className="text-gray-600">Indirizzo</p>
                  <p className="font-medium">{parsedData.address}</p>
                </div>
              )}
              {parsedData.price && (
                <div>
                  <p className="text-gray-600">Prezzo</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(parsedData.price)}
                  </p>
                </div>
              )}
              {parsedData.surface && (
                <div>
                  <p className="text-gray-600">Superficie</p>
                  <p className="font-medium">{parsedData.surface} m²</p>
                </div>
              )}
              {parsedData.rooms && (
                <div>
                  <p className="text-gray-600">Locali</p>
                  <p className="font-medium">{parsedData.rooms}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {parsedData && parsedImages.length > 0 && (
        <ImageGallery images={parsedImages} />
      )}

      {/* Errore */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
