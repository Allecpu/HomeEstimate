export type PhotoConditionLabel = 'da_ristrutturare' | 'discreto' | 'buono' | 'ottimo';

export interface PhotoConditionPerPhoto {
  url: string;
  summary: string;
  issues?: string | null;
}

export interface PhotoConditionResult {
  label: PhotoConditionLabel;
  score: number;
  confidence: number;
  reasoning: string;
  per_photo: PhotoConditionPerPhoto[];
}

export async function analyzePhotoConditionFromStorage(
  listingId: string,
  locale: string = 'it'
): Promise<PhotoConditionResult> {
  const response = await fetch('http://localhost:8000/api/analysis/photo-condition-from-storage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      listing_id: listingId,
      locale,
    }),
  });

  if (!response.ok) {
    let errorDetail: string | null = null;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData.detail === 'string') {
        errorDetail = errorData.detail;
      }
    } catch {
      // ignore JSON parsing issues
    }
    throw new Error(errorDetail ?? 'Errore durante l\'analisi delle foto');
  }

  const data = await response.json();
  return data as PhotoConditionResult;
}

export async function getSavedAnalysis(
  listingId: string
): Promise<PhotoConditionResult | null> {
  try {
    const response = await fetch(`http://localhost:8000/api/analysis/get-analysis/${encodeURIComponent(listingId)}`);

    if (response.status === 404) {
      // No saved analysis found - this is expected
      return null;
    }

    if (!response.ok) {
      console.warn('Failed to retrieve saved analysis:', response.status);
      return null;
    }

    const data = await response.json();
    return data as PhotoConditionResult;
  } catch (error) {
    console.error('Error retrieving saved analysis:', error);
    return null;
  }
}
