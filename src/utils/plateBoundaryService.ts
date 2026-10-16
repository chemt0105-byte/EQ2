import {
  PlateBoundaryFeature,
  PlateBoundaryFeatureCollection,
  PlateBoundaryStyle,
  PlateBoundaryTypeKey,
} from '../types/plateBoundary';
import { LineString, MultiLineString, Geometry } from 'geojson';

export const USGS_PLATE_BOUNDARIES_QUERY_URL =
  'https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1/query?where=1%3D1&outFields=NAME%2CLABEL&outSR=4326&f=geojson';

export const USGS_PLATE_BOUNDARIES_SERVICE_URL =
  'https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/1';

/**
 * LABEL 속성 번역 매핑
 * - Convergent Boundary: 수렴 경계
 * - Divergent Boundary: 발산 경계
 * - Transform Boundary: 보존 경계
 * - Other, 빈 값 또는 알 수 없는 값: 기타·미분류 경계
 */
export function getPlateBoundaryTypeKey(label: unknown): PlateBoundaryTypeKey {
  if (typeof label !== 'string') return 'other';
  const trimmed = label.trim().toLowerCase();
  if (trimmed === 'convergent boundary') return 'convergent';
  if (trimmed === 'divergent boundary') return 'divergent';
  if (trimmed === 'transform boundary') return 'transform';
  return 'other';
}

export function translatePlateBoundaryLabel(label: unknown): {
  typeKey: PlateBoundaryTypeKey;
  koreanName: string;
} {
  const typeKey = getPlateBoundaryTypeKey(label);
  switch (typeKey) {
    case 'convergent':
      return { typeKey, koreanName: '수렴 경계' };
    case 'divergent':
      return { typeKey, koreanName: '발산 경계' };
    case 'transform':
      return { typeKey, koreanName: '보존 경계' };
    case 'other':
    default:
      return { typeKey: 'other', koreanName: '기타·미분류 경계' };
  }
}

/**
 * 경계선 스타일 정의 (색상 + 선 모양 함께 사용)
 * - 수렴 경계: 짙은 붉은 실선
 * - 발산 경계: 짙은 청록색 긴 점선
 * - 보존 경계: 짙은 회색 짧은 점선
 * - 기타·미분류: 옅은 회색 점선
 */
export const PLATE_BOUNDARY_STYLES: Record<PlateBoundaryTypeKey, PlateBoundaryStyle> = {
  convergent: {
    typeKey: 'convergent',
    koreanName: '수렴 경계',
    originalLabel: 'Convergent Boundary',
    color: '#b91c1c', // 짙은 붉은색
    weight: 3.5,
    opacity: 0.95,
    dashArray: undefined, // 실선
    description: '판과 판이 서로 모여드는 경계 (짙은 붉은 실선)',
  },
  divergent: {
    typeKey: 'divergent',
    koreanName: '발산 경계',
    originalLabel: 'Divergent Boundary',
    color: '#0f766e', // 짙은 청록색
    weight: 3,
    opacity: 0.95,
    dashArray: '10, 7', // 긴 점선
    description: '판과 판이 서로 멀어지는 경계 (짙은 청록색 긴 점선)',
  },
  transform: {
    typeKey: 'transform',
    koreanName: '보존 경계',
    originalLabel: 'Transform Boundary',
    color: '#374151', // 짙은 회색
    weight: 2.5,
    opacity: 0.9,
    dashArray: '4, 4', // 짧은 점선
    description: '판과 판이 서로 어긋나며 미끄러지는 경계 (짙은 회색 짧은 점선)',
  },
  other: {
    typeKey: 'other',
    koreanName: '기타·미분류 경계',
    originalLabel: 'Other / Unknown',
    color: '#9ca3af', // 옅은 회색
    weight: 2,
    opacity: 0.8,
    dashArray: '3, 6', // 옅은 회색 점선
    description: '분류 미확정 및 기타 경계 구간 (옅은 회색 점선)',
  },
};

/**
 * 날짜변경선(180°/-180°) 부근에서 세계지도를 가로지르는 잘못된 직선 연결 방지 유틸리티
 */
function sanitizeAntimeridianCoordinates(coords: number[][]): number[][][] {
  if (coords.length < 2) return [coords];
  const segments: number[][][] = [];
  let currentSegment: number[][] = [coords[0]];

  for (let i = 1; i < coords.length; i++) {
    const prevLon = coords[i - 1][0];
    const currLon = coords[i][0];
    // 경도 차이가 180도를 넘으면 날짜변경선을 가로지르는 점프선이므로 분할
    if (Math.abs(currLon - prevLon) > 180) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [coords[i]];
    } else {
      currentSegment.push(coords[i]);
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments.length > 0 ? segments : [coords];
}

/**
 * GeoJSON Feature의 날짜변경선 처리 적용
 */
function fixFeatureAntimeridian(feature: PlateBoundaryFeature): PlateBoundaryFeature {
  const geom = feature.geometry;
  if (!geom) return feature;

  if (geom.type === 'LineString') {
    const coords = (geom as LineString).coordinates;
    const splitSegments = sanitizeAntimeridianCoordinates(coords);
    if (splitSegments.length === 1) {
      return feature;
    }
    return {
      ...feature,
      geometry: {
        type: 'MultiLineString',
        coordinates: splitSegments,
      },
    };
  }

  if (geom.type === 'MultiLineString') {
    const multiCoords = (geom as MultiLineString).coordinates;
    const finalSegments: number[][][] = [];
    for (const segment of multiCoords) {
      const split = sanitizeAntimeridianCoordinates(segment);
      finalSegments.push(...split);
    }
    return {
      ...feature,
      geometry: {
        type: 'MultiLineString',
        coordinates: finalSegments,
      },
    };
  }

  return feature;
}

/**
 * USGS 판 경계 전체 GeoJSON 피드 요청
 * - 응답 건수 제한(exceededTransferLimit) 발생 시 resultOffset 기반 페이지네이션으로 전체 수신
 * - 오류 객체 및 형식 검증
 */
export async function fetchAllPlateBoundaries(): Promise<PlateBoundaryFeatureCollection> {
  const allFeatures: PlateBoundaryFeature[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${USGS_PLATE_BOUNDARIES_QUERY_URL}&resultOffset=${offset}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`판 경계 서버 응답 실패 (HTTP ${response.status} ${response.statusText})`);
    }

    const data = await response.json();

    // 1. ArcGIS 오류 객체 확인
    if (data?.error) {
      const msg = data.error.message || data.error.details?.join(', ') || '알 수 없는 ArcGIS 오류';
      throw new Error(`USGS 판 경계 서비스 오류: ${msg}`);
    }

    // 2. GeoJSON 형식 확인
    if (data?.type !== 'FeatureCollection' || !Array.isArray(data?.features)) {
      throw new Error('수신된 데이터가 유효한 GeoJSON FeatureCollection 형식이 아닙니다.');
    }

    const features: PlateBoundaryFeature[] = data.features;
    for (const f of features) {
      allFeatures.push(fixFeatureAntimeridian(f));
    }

    // 3. 응답 건수 제한(exceededTransferLimit) 확인 후 추가 페이지 요청
    if (data.exceededTransferLimit === true && features.length > 0) {
      offset += features.length;
    } else {
      hasMore = false;
    }
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}
