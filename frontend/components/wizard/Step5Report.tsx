'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Home, TrendingUp, Calculator, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PropertyFormData } from '@/lib/validation';

interface Step5Props {
  onBack: () => void;
  propertyData: PropertyFormData & { lat?: number; lng?: number };
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
              <p className="text-sm text-gray-600 mb-1">Prezzo medio al m²</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(avgPricePerSqm)} / m²
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Fascia alta (top) della zona</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(topPricePerSqm)} / m²
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
              <p className="text-lg font-semibold">minimo {formatCurrency(minRenovationCostPerSqm)} / m²</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Superficie immobile</p>
              <p className="text-lg font-semibold">{propertyData.surface} m²</p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Formula:</strong> Valore ristrutturazione = max({renovationCostPerSqm}, 500) × {propertyData.surface}
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
                <Label htmlFor="propertyValue">Valore immobile (€)</Label>
                <Input
                  id="propertyValue"
                  type="number"
                  value={rentalParams.propertyValue}
                  onChange={(e) => handleParamChange('propertyValue', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annualCosts">Tasse + costi annui fissi (€)</Label>
                <Input
                  id="annualCosts"
                  type="number"
                  value={rentalParams.annualCosts}
                  onChange={(e) => handleParamChange('annualCosts', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Canone mensile 4+4 (€)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  value={rentalParams.monthlyRent}
                  onChange={(e) => handleParamChange('monthlyRent', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nightlyPrice">Prezzo per notte (€)</Label>
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
              💡 Suggerimento: imposta i costi annui per IMU/TASI, assicurazione, condominio, manutenzioni, gestione
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
                    {formatCurrency(rentalParams.monthlyRent)} × 12
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Netto dopo costi</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(longTermCalculations.netIncome)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(longTermCalculations.annualRevenue)} − {formatCurrency(rentalParams.annualCosts)}
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
                    365 × {rentalParams.occupancyRate}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ricavi lordi annui</p>
                  <p className="text-lg font-semibold text-green-900">
                    {formatCurrency(shortTermCalculations.annualRevenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(rentalParams.nightlyPrice)} × {shortTermCalculations.occupiedNights}
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
                  {formatCurrency(shortTermCalculations.annualRevenue)} − {formatCurrency(shortTermCalculations.commissions)} − {formatCurrency(rentalParams.annualCosts)}
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
              💡 Modifica <strong>occupazione breve</strong> per simulare stagionalità.
              Aumenta o riduci <strong>commissioni</strong> per gestione autonoma o full service.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> Questa è una stima indicativa basata sui dati forniti e sull&apos;analisi
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
