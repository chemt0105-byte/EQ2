import { Feature, Geometry, FeatureCollection } from 'geojson';

export type PlateBoundaryTypeKey = 'convergent' | 'divergent' | 'transform' | 'other';

export interface PlateBoundaryProperties {
  NAME?: string | null;
  LABEL?: string | null;
  [key: string]: unknown;
}

export type PlateBoundaryFeature = Feature<Geometry, PlateBoundaryProperties>;

export type PlateBoundaryFeatureCollection = FeatureCollection<Geometry, PlateBoundaryProperties>;

export interface PlateBoundaryStyle {
  typeKey: PlateBoundaryTypeKey;
  koreanName: string;
  originalLabel: string;
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  description: string;
}

export interface PlateBoundaryFilters {
  enabled: boolean;
  convergent: boolean;
  divergent: boolean;
  transform: boolean;
  other: boolean;
}
