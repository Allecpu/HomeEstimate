'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Home, TrendingUp, Calculator, DollarSign, Calendar, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PropertyFormData } from '@/lib/validation';
import type { PhotoConditionLabel, PhotoConditionResult } from '@/lib/photo-analysis';

interface Step5Props {
  onBack: () => void;
  propertyData: PropertyFormData & {
    lat?: number;
    lng?: number;
    photoCondition?: PhotoConditionResult;
    photoStorageId?: string;
    photoStorageCount?: number;
  };
  estimationData: {
    estimatedValue: number;
    pricePerSqm: number;
    confidence: number;
    comparables: number;
    marketTrend: string;
  };
}

interface RentalParams {
  propertyValue: number;
  annualCosts: number;
  monthlyRent: number;
  nightlyPrice: number;
  occupancyRate: number;
  commissionRate: number;
}

const PHOTO_CONDITION_LABELS: Record<PhotoConditionLabel, string> = {
  da_ristrutturare: 'Da ristrutturare',
  discreto: 'Discreto',
  buono: 'Buono',
  ottimo: 'Ottimo',
};

export function Step5Report({ onBack, propertyData, estimationData }: Step5Props) {
  // Parametri modificabili per le simulazioni affitto
  const [rentalParams, setRentalParams] = useState<RentalParams>({
    propertyValue: estimationData.estimatedValue,
    annualCosts: Math.round(estimationData.estimatedValue * 0.015), // Stima 1.5% del valore
    monthlyRent: Math.round((estimationData.estimatedValue * 0.04) / 12), // Stima 4% annuo
    nightlyPrice: Math.round((estimationData.estimatedValue * 0.04) / 365 * 2), // Stima doppio rispetto affitto lungo
    occupancyRate: 62,
    commissionRate: 18,
  });

  // Prezzi zona (da estimationData)
  const avgPricePerSqm = estimationData.pricePerSqm;
  const topPricePerSqm = Math.round(estimationData.pricePerSqm * 1.3); // Stima +30% per fascia alta

  // KPI ristrutturazione
  const minRenovationCostPerSqm = 500;
  const renovationCostPerSqm = Math.max(minRenovationCostPerSqm, 500);
  const totalRenovationCost = renovationCostPerSqm * (propertyData.surface || 0);

  // Calcoli affitto lungo termine (4+4)
  const longTermCalculations = useMemo(() => {
    const annualRevenue = rentalParams.monthlyRent * 12;
    const netIncome = annualRevenue - rentalParams.annualCosts;
    const yieldRate = (netIncome / rentalParams.propertyValue) * 100;

    return {
      annualRevenue,
      netIncome,
      yieldRate,
    };
  }, [rentalParams]);

  // Calcoli affitto breve
  const shortTermCalculations = useMemo(() => {
    const occupiedNights = Math.round((365 * rentalParams.occupancyRate) / 100);
    const annualRevenue = rentalParams.nightlyPrice * occupiedNights;
    const commissions = (annualRevenue * rentalParams.commissionRate) / 100;
    const netIncome = annualRevenue - commissions - rentalParams.annualCosts;
    const yieldRate = (netIncome / rentalParams.propertyValue) * 100;

    return {
      occupiedNights,
      annualRevenue,
      commissions,
      netIncome,
      yieldRate,
    };
  }, [rentalParams]);

  const photoStorageId = propertyData.photoStorageId;
  const photoStorageCount = propertyData.photoStorageCount ?? 0;
  const hasPhotoArchive = Boolean(photoStorageId) && photoStorageCount > 0;
  const photoCondition = propertyData.photoCondition;
  const photoConditionScore = photoCondition ? Math.round(photoCondition.score) : 0;
  const photoConditionConfidence = photoCondition ? Math.round(photoCondition.confidence * 100) : 0;
  const photoConditionHighlights = photoCondition?.per_photo?.slice(0, 3) ?? [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 0) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const handleParamChange = (field: keyof RentalParams, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRentalParams(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Completo - Analisi Investimento
          </CardTitle>
          <CardDescription>
            Analisi dettagliata del valore immobiliare e simulazioni di rendimento
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analisi Foto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5" />
            Stato dell&apos;immobile dalle foto
          </CardTitle>
          <CardDescription>
            Risultato dell&apos;analisi visiva basata sulle foto archiviate con l&apos;estensione.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPhotoArchive && (
            <p className="text-xs text-muted-foreground">
              Foto archiviate: {photoStorageCount}
              {photoStorageId ? (
                <>
                  {' '} - ID archivio: <span className="font-mono text-[11px]">{photoStorageId}</span>
                </>
              ) : null}
            </p>
          )}
          {photoCondition ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Condizione stimata</p>
                  <p className="text-2xl font-semibold">
                    {PHOTO_CONDITION_LABELS[photoCondition.label] ?? photoCondition.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Punteggio qualita</p>
                  <p className="text-2xl font-semibold">{photoConditionScore}</p>
                  <p className="text-xs text-muted-foreground">Scala 0-100</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidenza modello</p>
                  <p className="text-2xl font-semibold">{photoConditionConfidence}%</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Sintesi</p>
                <p className="text-sm leading-relaxed text-gray-700">{photoCondition.reasoning}</p>
              </div>

              {photoConditionHighlights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Highlight foto</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {photoConditionHighlights.map((item, index) => (
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
            <p className="text-sm text-gray-600">
              {hasPhotoArchive
                ? "Foto archiviate disponibili ma analisi non ancora eseguita. Torna allo Step 2 e clicca il pulsante Avvia analisi AI."
                : "Per ottenere la valutazione automatica scarica prima le foto con l'estensione e poi avvia l'analisi dallo Step 2."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Prezzi Immobiliari Zona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="w-5 h-5" />
            Prezzi Immobiliari della Zona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Prezzo medio al mÃ‚Â²</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(avgPricePerSqm)} / mÃ‚Â²
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Fascia alta (top) della zona</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(topPricePerSqm)} / mÃ‚Â²
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Ristrutturazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5" />
            KPI Ristrutturazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Costo base ristrutturazione</p>
              <p className="text-lg font-semibold">minimo {formatCurrency(minRenovationCostPerSqm)} / mÃ‚Â²</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Superficie immobile</p>
              <p className="text-lg font-semibold">{propertyData.surface} mÃ‚Â²</p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Formula:</strong> Valore ristrutturazione = max({renovationCostPerSqm}, 500) Ãƒâ€” {propertyData.surface}
            </p>
            <p className="text-xl font-bold text-purple-900">
              Costo totale stimato: {formatCurrency(totalRenovationCost)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simulazioni Affitto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Simulazioni Affitto
          </CardTitle>
          <CardDescription>
            Modifica i parametri per personalizzare le simulazioni
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parametri Modificabili */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Parametri Modificabili</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyValue">Valore immobile (Ã¢â€šÂ¬)</Label>
                <Input
                  id="propertyValue"
                  type="number"
                  value={rentalParams.propertyValue}
                  onChange={(e) => handleParamChange('propertyValue', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualCosts">Tasse + costi annui fissi (Ã¢â€šÂ¬)</Label>
                <Input
                  id="annualCosts"
                  type="number"
                  value={rentalParams.annualCosts}
                  onChange={(e) => handleParamChange('annualCosts', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Canone mensile 4+4 (Ã¢â€šÂ¬)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  value={rentalParams.monthlyRent}
                  onChange={(e) => handleParamChange('monthlyRent', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nightlyPrice">Prezzo per notte (Ã¢â€šÂ¬)</Label>
                <Input
                  id="nightlyPrice"
                  type="number"
                  value={rentalParams.nightlyPrice}
                  onChange={(e) => handleParamChange('nightlyPrice', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupancyRate">Occupazione breve (%)</Label>
                <Input
                  id="occupancyRate"
                  type="number"
                  min="0"
                  max="100"
                  value={rentalParams.occupancyRate}
                  onChange={(e) => handleParamChange('occupancyRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commissioni breve (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={rentalParams.commissionRate}
                  onChange={(e) => handleParamChange('commissionRate', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ã°Å¸â€™Â¡ Suggerimento: imposta i costi annui per IMU/TASI, assicurazione, condominio, manutenzioni, gestione
            </p>
          </div>

          {/* Affitto Lungo Termine (4+4) */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Affitto Lungo Termine (4+4)
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ricavi lordi annui</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(longTermCalculations.annualRevenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(rentalParams.monthlyRent)} Ãƒâ€” 12
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Netto dopo costi</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(longTermCalculations.netIncome)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(longTermCalculations.annualRevenue)} Ã¢Ë†â€™ {formatCurrency(rentalParams.annualCosts)}
                  </p>
                </div>
              </div>
              <div className="bg-blue-100 rounded p-3">
                <p className="text-sm text-gray-600 mb-1">Rendimento netto annuo</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(longTermCalculations.yieldRate, 2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Affitto Breve */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Affitto Breve
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Notti occupate</p>
                  <p className="text-lg font-semibold text-green-900">
                    {shortTermCalculations.occupiedNights}
                  </p>
                  <p className="text-xs text-gray-500">
                    365 Ãƒâ€” {rentalParams.occupancyRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ricavi lordi annui</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(shortTermCalculations.annualRevenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(rentalParams.nightlyPrice)} Ãƒâ€” {shortTermCalculations.occupiedNights}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Commissioni</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(shortTermCalculations.commissions)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {rentalParams.commissionRate}% dei ricavi
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Netto dopo costi</p>
                <p className="text-lg font-semibold text-green-900">
                  {formatCurrency(shortTermCalculations.netIncome)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(shortTermCalculations.annualRevenue)} Ã¢Ë†â€™ {formatCurrency(shortTermCalculations.commissions)} Ã¢Ë†â€™ {formatCurrency(rentalParams.annualCosts)}
                </p>
              </div>
              <div className="bg-green-100 rounded p-3">
                <p className="text-sm text-gray-600 mb-1">Rendimento netto annuo</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatNumber(shortTermCalculations.yieldRate, 2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Confronto Sintetico */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Confronto Sintetico</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Modello</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Ricavi lordi</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Costi totali</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Netto</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Rendimento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2 font-semibold">4+4</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(longTermCalculations.annualRevenue)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(rentalParams.annualCosts)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      {formatCurrency(longTermCalculations.netIncome)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-bold text-blue-900">
                      {formatNumber(longTermCalculations.yieldRate, 2)}%
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 px-4 py-2 font-semibold">Breve</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(shortTermCalculations.annualRevenue)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatCurrency(shortTermCalculations.commissions + rentalParams.annualCosts)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      {formatCurrency(shortTermCalculations.netIncome)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-bold text-green-900">
                      {formatNumber(shortTermCalculations.yieldRate, 2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Ã°Å¸â€™Â¡ Modifica <strong>occupazione breve</strong> per simulare stagionalitÃƒÂ .
              Aumenta o riduci <strong>commissioni</strong> per gestione autonoma o full service.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Questa ÃƒÂ¨ una stima indicativa basata sui dati forniti e sull&apos;analisi
          del mercato locale. Per una valutazione ufficiale, si consiglia di consultare un professionista
          del settore immobiliare.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          Indietro
        </Button>
        <Button
          type="button"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.print()}
        >
          Stampa Report
        </Button>
      </div>
    </div>
  );
}
