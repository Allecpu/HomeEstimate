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

