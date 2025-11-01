'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, AlertCircle, Loader2, MapPin, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PropertyFormData } from '@/lib/validation';

interface Step4Props {
  onNext: (estimationData: Record<string, unknown>) => void;
  onBack: () => void;
  propertyData: PropertyFormData & { lat?: number; lng?: number };
}

interface EstimationResult {
  estimatedValue: number;
  pricePerSqm: number;
  confidence: number;
  comparables: number;
  marketTrend: string;
}

export function Step4Calculation({ onNext, onBack, propertyData }: Step4Props) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculationSteps = [
    { step: 1, message: 'Analisi dati immobile...', duration: 1000 },
    { step: 2, message: 'Ricerca immobili comparabili...', duration: 1500 },
    { step: 3, message: 'Analisi mercato locale...', duration: 1200 },
    { step: 4, message: 'Applicazione modelli di valutazione...', duration: 1800 },
    { step: 5, message: 'Calcolo stima finale...', duration: 1000 },
  ];

  useEffect(() => {
    performCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performCalculation = async () => {
    setIsCalculating(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate calculation steps
      for (let i = 0; i < calculationSteps.length; i++) {
        const stepInfo = calculationSteps[i];
        setCurrentStep(stepInfo.message);
        setProgress(((i + 1) / calculationSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, stepInfo.duration));
      }

      // Call backend API
      const response = await fetch('http://localhost:8000/api/valuation/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: propertyData.address,
          city: propertyData.city,
          surface: propertyData.surface,
          price: propertyData.price,
          rooms: propertyData.rooms,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          floor: propertyData.floor,
          latitude: propertyData.lat,
          longitude: propertyData.lng,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante il calcolo della stima');
      }

      const data = await response.json();

      // Set result
      const estimationResult: EstimationResult = {
        estimatedValue: data.estimatedValue || 0,
        pricePerSqm: data.priceM2 || 0,
        confidence: data.confidenceScore || 0,
        comparables: data.comparables?.length || 0,
        marketTrend: data.marketPosition === 'in_linea' ? 'stabile' :
                     data.marketPosition === 'sopra_mercato' ? 'crescente' : 'decrescente',
      };

      setResult(estimationResult);
      setCurrentStep('Calcolo completato!');
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err instanceof Error ? err.message : 'Errore durante il calcolo della stima');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleContinue = () => {
    if (result) {
      onNext(result as unknown as Record<string, unknown>);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    performCalculation();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'Alta';
    if (confidence >= 60) return 'Media';
    return 'Bassa';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'crescente') return '📈';
    if (trend === 'decrescente') return '📉';
    return '➡️';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Elaborazione Stima
          </CardTitle>
          <CardDescription>
            Stiamo analizzando i dati e calcolando la stima del valore di mercato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Home className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Immobile</p>
                <p className="font-semibold text-gray-900">
                  {propertyData.surface} m² • {propertyData.rooms} locali • {propertyData.bedrooms} camere
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Posizione</p>
                <p className="font-semibold text-gray-900">
                  {propertyData.address}, {propertyData.city}
                </p>
              </div>
            </div>
          </div>

          {/* Calculation Progress */}
          {isCalculating && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{currentStep}</span>
                  <span className="font-semibold text-blue-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              <p className="text-center text-sm text-gray-500">
                Questo processo potrebbe richiedere alcuni secondi...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isCalculating && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && !isCalculating && !error && (
            <div className="space-y-4">
              {/* Success Message */}
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="ml-2 text-green-800">
                  Stima completata con successo!
                </AlertDescription>
              </Alert>

              {/* Main Result */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Valore Stimato</p>
                    <p className="text-4xl font-bold text-blue-900">
                      {formatCurrency(result.estimatedValue)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(result.pricePerSqm)}/m²
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Confidence */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-gray-600">Affidabilità</p>
                      <p className={`text-2xl font-bold ${getConfidenceColor(result.confidence)}`}>
                        {result.confidence}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {getConfidenceLabel(result.confidence)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Comparables */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-gray-600">Comparabili</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {result.comparables}
                      </p>
                      <p className="text-xs text-gray-500">
                        Immobili analizzati
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Market Trend */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-gray-600">Trend Mercato</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {getTrendIcon(result.marketTrend)} {result.marketTrend}
                      </p>
                      <p className="text-xs text-gray-500">
                        Andamento zona
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Info Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Questa è una stima indicativa basata sui dati forniti e sull&apos;analisi
                  del mercato locale. Per una valutazione ufficiale, si consiglia di consultare un professionista
                  del settore immobiliare.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={isCalculating}
        >
          Indietro
        </Button>

        {error && !isCalculating && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            className="flex-1"
          >
            Riprova
          </Button>
        )}

        {result && !error && !isCalculating && (
          <Button
            type="button"
            onClick={handleContinue}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            Visualizza Report Completo
          </Button>
        )}
      </div>
    </div>
  );
}
