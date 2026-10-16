/**
 * 지진 규모에 따른 화면상 원 반지름 계산식
 * 반지름은 Math.max(4, Math.min(22, 4 + (mag - 2.5) * 3)) 제한식을 사용합니다.
 */
export function getMagnitudeRadius(mag: number | null | undefined): number {
  if (mag === null || mag === undefined || isNaN(mag)) {
    return 4; // 규모 정보가 없을 때의 기본 최소 클릭 크기
  }
  return Math.max(4, Math.min(22, 4 + (mag - 2.5) * 3));
}

export interface DepthClassification {
  id: 'shallow' | 'intermediate' | 'deep' | 'unknown';
  label: string;
  subLabel: string;
  fillColor: string;
  borderColor: string;
  badgeClass: string;
}

/**
 * 지진 깊이에 따른 색상 및 텍스트 분류
 * - 70km 미만: 주황색
 * - 70km 이상 300km 미만: 파란색
 * - 300km 이상: 보라색
 * - 깊이 정보 없음: 회색
 * (깊이 색은 위험 등급이 아니며, 진원의 지하 깊이 구간을 나타냅니다.)
 */
export function getDepthClassification(
  depthKm: number | null | undefined
): DepthClassification {
  if (depthKm === null || depthKm === undefined || isNaN(depthKm)) {
    return {
      id: 'unknown',
      label: '깊이 정보 없음',
      subLabel: '관측 자료 미기재',
      fillColor: '#94a3b8', // 회색
      borderColor: '#475569',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  }

  if (depthKm < 70) {
    return {
      id: 'shallow',
      label: '70 km 미만',
      subLabel: '천발 지진 구간',
      fillColor: '#f97316', // 주황색
      borderColor: '#c2410c',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    };
  }

  if (depthKm < 300) {
    return {
      id: 'intermediate',
      label: '70 km 이상 ~ 300 km 미만',
      subLabel: '중발 지진 구간',
      fillColor: '#3b82f6', // 파란색
      borderColor: '#1d4ed8',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  return {
    id: 'deep',
    label: '300 km 이상',
    subLabel: '심발 지진 구간',
    fillColor: '#a855f7', // 보라색
    borderColor: '#7e22ce',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  };
}
