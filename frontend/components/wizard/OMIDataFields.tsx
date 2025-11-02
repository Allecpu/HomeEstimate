'use client';

import React, { useEffect, useState } from 'react';
import { Info, Building2, MapPin, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getPropertyTypes, getOMIZones, isCitySupported, type PropertyTypeInfo } from '@/lib/omi-api';

interface OMIDataFieldsProps {
  city?: string;
  propertyTypeOMI?: string;
  zonaOMI?: string;
  onPropertyTypeChange: (value: string) => void;
  onZonaOMIChange: (value: string) => void;
}

/**
 * Componente per la selezione dei dati OMI (Osservatorio Mercato Immobiliare)
 * Permette di scegliere il tipo di immobile e la zona OMI per ottenere valutazioni più accurate
 */
export function OMIDataFields({
  city,
  propertyTypeOMI,
  zonaOMI,
  onPropertyTypeChange,
  onZonaOMIChange,
}: OMIDataFieldsProps) {
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeInfo[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [citySupported, setCitySupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carica i tipi di immobile disponibili
  useEffect(() => {
    async function loadPropertyTypes() {
      try {
        setIsLoadingTypes(true);
        setError(null);
        const types = await getPropertyTypes();
        setPropertyTypes(types);
      } catch (err) {
        console.error('Errore nel caricamento tipi immobile:', err);
        setError('Impossibile caricare i tipi di immobile');
      } finally {
        setIsLoadingTypes(false);
      }
    }

    loadPropertyTypes();
  }, []);

  // Verifica se la città è supportata e carica le zone OMI
  useEffect(() => {
    if (!city || city.trim().length < 2) {
      setCitySupported(null);
      setZones([]);
      return;
    }

    async function checkCityAndLoadZones() {
      try {
        setIsLoadingZones(true);
        setError(null);

        // Verifica se la città è supportata
        const supported = await isCitySupported(city);
        setCitySupported(supported);

        if (supported) {
          // Carica le zone OMI disponibili
          const availableZones = await getOMIZones(city);
          setZones(availableZones);
        } else {
          setZones([]);
        }
      } catch (err) {
        console.error('Errore nel caricamento zone OMI:', err);
        setCitySupported(false);
        setZones([]);
      } finally {
        setIsLoadingZones(false);
      }
    }

    // Debounce per evitare troppe richieste
    const timeoutId = setTimeout(checkCityAndLoadZones, 500);
    return () => clearTimeout(timeoutId);
  }, [city]);

  // Se la città non è stata inserita
  if (!city || city.trim().length < 2) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Dati OMI</h3>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Inserisci prima la città per accedere ai dati OMI (Osservatorio del Mercato Immobiliare)
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Se la città non è supportata
  if (citySupported === false) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Dati OMI</h3>
        </div>
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            La città <strong>{city}</strong> non è attualmente supportata per i dati OMI.
            La valutazione utilizzerà solo l&apos;algoritmo proprietario.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Dati OMI</h3>
      </div>

      {citySupported === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifica disponibilità dati OMI per {city}...</span>
        </div>
      ) : (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              I dati OMI (Osservatorio del Mercato Immobiliare) forniscono quotazioni ufficiali
              per una valutazione più accurata. Questi campi sono opzionali ma consigliati.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tipo di immobile OMI */}
          <div className="space-y-2">
            <Label htmlFor="propertyTypeOMI" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Tipo di immobile
              <span className="text-xs text-muted-foreground font-normal">(opzionale)</span>
            </Label>
            <Select
              value={propertyTypeOMI || ''}
              onValueChange={onPropertyTypeChange}
              disabled={isLoadingTypes}
            >
              <SelectTrigger id="propertyTypeOMI">
                <SelectValue placeholder="Seleziona tipo immobile" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTypes ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <SelectItem value="">Nessuno</SelectItem>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.display_name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Seleziona la categoria di immobile per ottenere quotazioni OMI specifiche
            </p>
          </div>

          {/* Zona OMI */}
          <div className="space-y-2">
            <Label htmlFor="zonaOMI" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Zona OMI
              <span className="text-xs text-muted-foreground font-normal">(opzionale)</span>
            </Label>
            {isLoadingZones ? (
              <div className="flex items-center gap-2 p-2 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Caricamento zone...</span>
              </div>
            ) : zones.length > 0 ? (
              <Select value={zonaOMI || ''} onValueChange={onZonaOMIChange}>
                <SelectTrigger id="zonaOMI">
                  <SelectValue placeholder="Seleziona zona OMI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte le zone</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      Zona {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="zonaOMI"
                placeholder="Es: B12, C1, D3..."
                value={zonaOMI || ''}
                onChange={(e) => onZonaOMIChange(e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {zones.length > 0
                ? `Trovate ${zones.length} zone OMI per ${city}`
                : 'Inserisci manualmente la zona OMI se la conosci (es: B12, C1, D3)'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
