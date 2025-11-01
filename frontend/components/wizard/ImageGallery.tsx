/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useMemo, useState } from 'react';
import { Download, Images, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ImageItem {
  url: string;
  caption: string | null | undefined;
  alt: string | null | undefined;
}

interface ImageGalleryProps {
  images: Array<ImageItem | string | Record<string, unknown> | null | undefined> | null | undefined;
}

function getExtensionFromType(contentType: string | null, fallbackUrl: string) {
  if (contentType) {
    const subtype = contentType.split('/')[1];
    if (subtype) {
      return subtype.split(';')[0];
    }
  }

  const urlParts = fallbackUrl.split('?')[0].split('#')[0].split('.');
  const extension = urlParts.length > 1 ? urlParts.pop() : null;
  return extension || 'jpg';
}

function buildFilename(index: number, caption?: string | null) {
  const baseName = caption && caption.trim().length > 0 ? caption : `immagine-${index + 1}`;
  return baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const normalizedImages = useMemo(() => {
    if (!images) {
      return [] as ImageItem[];
    }

    return images
      .map((item) => {
        if (!item) {
          return null;
        }

        if (typeof item === 'string') {
          return {
            url: item,
            caption: undefined,
            alt: undefined,
          } satisfies ImageItem;
        }

        if (typeof item === 'object' && 'url' in item && item.url) {
          const itemObj = item as Record<string, unknown>;
          return {
            url: itemObj.url as string,
            caption: (itemObj.caption ?? itemObj.alt ?? undefined) as string | null | undefined,
            alt: (itemObj.alt ?? itemObj.caption ?? undefined) as string | null | undefined,
          } satisfies ImageItem;
        }

        if (typeof item === 'object') {
          const itemObj = item as unknown as Record<string, unknown>;
          const possibleUrl =
            itemObj.url ||
            itemObj.src ||
            itemObj.href;

          if (typeof possibleUrl === 'string' && possibleUrl.length > 0) {
            return {
              url: possibleUrl,
              caption: (itemObj.caption as string | null | undefined) ?? undefined,
              alt: (itemObj.alt as string | null | undefined) ?? undefined,
            } satisfies ImageItem;
          }
        }

        return null;
      })
      .filter((item): item is ImageItem => Boolean(item?.url));
  }, [images]);

  const downloadImage = async (url: string, filename: string) => {
    setDownloadError(null);

    try {
      const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error("Risposta non valida durante il download dell'immagine");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download image error:', error);
      setDownloadError("Impossibile scaricare l'immagine selezionata. Riprova.");
    }
  };

  const downloadAllImages = async () => {
    if (normalizedImages.length === 0) {
      return;
    }

    setDownloadError(null);
    setIsDownloadingAll(true);

    try {
      const zip = new JSZip();

      for (let index = 0; index < normalizedImages.length; index += 1) {
        const image = normalizedImages[index];
        const response = await fetch(`/api/image-proxy?url=${encodeURIComponent(image.url)}`);

        if (!response.ok) {
          throw new Error(`Download fallito per l’immagine ${index + 1}`);
        }

        const blob = await response.blob();
        const extension = getExtensionFromType(blob.type, image.url);
        const filename = `${buildFilename(index, image.caption)}.${extension}`;
        zip.file(filename, await blob.arrayBuffer());
      }

      const archive = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'immagini-annuncio.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download all images error:', error);
      setDownloadError('Non è stato possibile scaricare tutte le immagini. Riprova più tardi.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  if (normalizedImages.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="w-5 h-5" />
          Galleria immagini annuncio
        </CardTitle>
        <CardDescription>Scarica singole immagini o l&apos;intera galleria in un archivio ZIP.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {downloadError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{downloadError}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={downloadAllImages} disabled={isDownloadingAll} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            {isDownloadingAll ? 'Preparazione...' : 'Scarica tutte'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {normalizedImages.map((image, index) => {
            const filename = `${buildFilename(index, image.caption)}.jpg`;

            return (
              <div key={`${image.url}-${index}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.alt ?? `Immagine ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm text-gray-700">
                    {image.caption || `Immagine ${index + 1}`}
                  </p>
                  <Button onClick={() => downloadImage(image.url, filename)} variant="secondary" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Scarica
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
