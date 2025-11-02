'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PropertyFormData } from '@/lib/validation';
import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';

// Import Leaflet dynamically to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface Step3Props {
  onNext: (data: { lat: number; lng: number }) => void;
  onBack: () => void;
  propertyData: PropertyFormData;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export function Step3VerifyLocation({ onNext, onBack, propertyData }: Step3Props) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);

  // Fix Leaflet icon issue with Next.js
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        const LeafletIcon = leaflet.Icon.Default.prototype as unknown as {
          _getIconUrl?: string;
        };
        delete LeafletIcon._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      });
    }
  }, []);

  // Geocode address on mount
  useEffect(() => {
    const geocodeAddress = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const address = `${propertyData.address}, ${propertyData.city}, Italia`;
        const encodedAddress = encodeURIComponent(address);

        // Using Nominatim (OpenStreetMap) for geocoding - free and no API key required
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
          {
            headers: {
              'User-Agent': 'HomeEstimate/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Errore nella geocodifica dell\'indirizzo');
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const location = data[0];
          setCoordinates({
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
          });
          setHasUserSelected(false);
          setIsConfirmed(false);
        } else {
          throw new Error('Indirizzo non trovato. Verifica che l\'indirizzo sia corretto.');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError(err instanceof Error ? err.message : 'Errore durante la geocodifica');
      } finally {
        setIsLoading(false);
      }
    };

    if (propertyData.address && propertyData.city) {
      geocodeAddress();
    } else {
      setError('Indirizzo o città mancante');
      setIsLoading(false);
    }
  }, [propertyData.address, propertyData.city]);

  const handleConfirm = () => {
    if (coordinates) {
      setIsConfirmed(true);
      onNext(coordinates);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Trigger re-geocoding
    const geocodeAddress = async () => {
      try {
        const address = `${propertyData.address}, ${propertyData.city}, Italia`;
        const encodedAddress = encodeURIComponent(address);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
          {
            headers: {
              'User-Agent': 'HomeEstimate/1.0',
            },
          }
        );

        const data = await response.json();

        if (data && data.length > 0) {
          const location = data[0];
          setCoordinates({
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
          });
          setHasUserSelected(false);
          setIsConfirmed(false);
          setError(null);
        } else {
          throw new Error('Indirizzo non trovato');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la geocodifica');
      } finally {
        setIsLoading(false);
      }
    };

    geocodeAddress();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Verifica Posizione
          </CardTitle>
          <CardDescription>
            Conferma che la posizione dell&apos;immobile sulla mappa sia corretta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Indirizzo da verificare:</p>
            <p className="text-lg font-semibold text-gray-900">
              {propertyData.address}, {propertyData.city}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600">Localizzazione in corso...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Map Display */}
          {coordinates && !isLoading && !error && (
            <>
              <div className="rounded-lg overflow-hidden border-2 border-gray-200" style={{ height: '400px' }}>
                <MapContainer
                  center={[coordinates.lat, coordinates.lng]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  onClick={(event: LeafletMouseEvent) => {
                    const { lat, lng } = event.latlng;
                    setCoordinates({ lat, lng });
                    setHasUserSelected(true);
                    setIsConfirmed(false);
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[coordinates.lat, coordinates.lng]}
                    draggable
                    eventHandlers={{
                      dragend: (event) => {
                        const marker = event.target as LeafletMarker;
                        const { lat, lng } = marker.getLatLng();
                        setCoordinates({ lat, lng });
                        setHasUserSelected(true);
                        setIsConfirmed(false);
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">{propertyData.address}</p>
                        <p className="text-sm text-gray-600">{propertyData.city}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Success Message */}
              {!isConfirmed && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="ml-2 text-green-800">
                    {hasUserSelected
                      ? 'Posizione selezionata! Conferma che la posizione sia corretta prima di procedere.'
                      : 'Trascina il marker o clicca sulla mappa per selezionare con precisione la posizione.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Coordinates Display */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">Latitudine</p>
                  <p className="font-mono font-semibold">{coordinates.lat.toFixed(6)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">Longitudine</p>
                  <p className="font-mono font-semibold">{coordinates.lng.toFixed(6)}</p>
                </div>
              </div>
            </>
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
        >
          Indietro
        </Button>

        {error && !isLoading && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            className="flex-1"
          >
            Riprova
          </Button>
        )}

        {coordinates && !error && (
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            disabled={isLoading || !hasUserSelected}
          >
            {isConfirmed ? 'Confermato ✓' : 'Conferma Posizione'}
          </Button>
        )}
      </div>
    </div>
  );
}
