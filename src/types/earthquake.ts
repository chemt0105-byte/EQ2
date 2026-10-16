export interface UsgsEarthquakeFeature {
  type: 'Feature';
  id: string | number;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    updated: number | null;
    url: string | null;
    detail: string | null;
    magType: string | null;
    type: string;
    title: string | null;
    status?: string | null;
    tsunami?: number | null;
    sig?: number | null;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number | null]; // [longitude, latitude, depth_km]
  };
}

export interface UsgsGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: UsgsEarthquakeFeature[];
}

export interface ValidatedEarthquake {
  id: string;
  lat: number;
  lng: number;
  depthKm: number | null;
  magnitude: number | null;
  magType: string | null;
  place: string | null;
  time: number | null;
  url: string | null;
  rawFeature: UsgsEarthquakeFeature;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type PeriodOption = 'day' | 'week' | 'month';

export type DepthFilterOption = 'all' | 'shallow' | 'intermediate' | 'deep' | 'unknown';

export interface FilterState {
  period: PeriodOption;
  minMagnitude: number;
  depth: DepthFilterOption;
}
