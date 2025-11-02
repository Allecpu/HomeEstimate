export interface ComparableResult {
  id: string;
  address: string;
  distance: number;
  price: number;
  priceM2: number;
  surface: number;
  similarityScore: number;
  includedInEstimate: boolean;
}
